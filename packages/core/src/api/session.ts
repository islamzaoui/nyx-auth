import type { Adapter, Attributes, DatabaseSession } from "../adapter";
import type { Nyx, NyxOptions } from "../core";
import { UnexpectedError } from "../errors";
import type { TimeSpan } from "../time-span";
import { stripSessionReservedAttributes } from "../utils/attributes";
import { constantTimeEqual, generateSessionId, hashSecret } from "../utils/crypto";
import type { Session, User } from "../utils/types";
import type { UserAPI } from "./user";

const SESSION_TOKEN_PATTERN = /^[a-kmnp-z2-9]{20,64}\.[a-kmnp-z2-9]{20,64}$/;

// Fixed hash used to equalize the timing of `validateToken` between the
// "session not found" and "wrong secret" paths (see `compareWithDummySecret`).
// Any fixed 32-byte value would do — it never matches a real secret, it only
// exists so `constantTimeEqual` runs its full byte loop at the same cost as
// the real comparison.
const DUMMY_SECRET_HASH = new Uint8Array(32);

/**
 * The session API, accessed through `nyx.session.*` on a {@link Nyx} instance.
 *
 * Handles creating, validating, invalidating and updating sessions. Public
 * methods never throw — on failure they return an {@link UnexpectedError}
 * instead. Check with `result instanceof Error`.
 *
 * @typeParam Select - Session attributes as stored in the database.
 * @typeParam Insert - Session attributes accepted when creating a session.
 * @typeParam SessionAttrs - Session attributes exposed to the application.
 * @typeParam UserSelect - User attributes as stored in the database.
 * @typeParam UserAttrs - User attributes exposed to the application.
 */
export class SessionAPI<
	Select extends object = object,
	Insert extends object = object,
	SessionAttrs extends object = Select,
	UserSelect extends object = object,
	UserAttrs extends object = UserSelect,
> {
	private readonly adapter: Adapter<Attributes<Select, Insert>, Attributes<UserSelect, object>>;
	private readonly inactivityTimeout: TimeSpan;
	private readonly activityCheckInterval: TimeSpan;
	private readonly mapSessionAttributes: (databaseSessionAttributes: Select) => SessionAttrs;
	private readonly mapUserAttributes: (databaseUserAttributes: UserSelect) => UserAttrs;

	constructor(
		adapter: Adapter<Attributes<Select, Insert>, Attributes<UserSelect, object>>,
		inactivityTimeout: TimeSpan,
		activityCheckInterval: TimeSpan,
		mapSessionAttributes: (databaseSessionAttributes: Select) => SessionAttrs,
		mapUserAttributes: (databaseUserAttributes: UserSelect) => UserAttrs
	) {
		this.adapter = adapter;
		this.inactivityTimeout = inactivityTimeout;
		this.activityCheckInterval = activityCheckInterval;
		this.mapSessionAttributes = mapSessionAttributes;
		this.mapUserAttributes = mapUserAttributes;
	}

	/**
	 * The inferred shape of sessions handled by this instance.
	 *
	 * Use `typeof nyx.session.$infer` to derive the session type:
	 *
	 * ```ts
	 * import { nyx } from "./nyx";
	 *
	 * export type Session = typeof nyx.session.$infer;
	 * ```
	 */
	get $infer(): Session<SessionAttrs> {
		return {} as Session<SessionAttrs>;
	}

	/**
	 * Creates a new session for a user and returns the session token and value.
	 *
	 * The token is the credential to give to the client (e.g. via a cookie) —
	 * it contains the session secret and can only be seen once. The session
	 * value is the public shape exposed to the application.
	 *
	 * ### Example
	 *
	 * ```ts
	 * const result = await nyx.session.create(userId, { ipAddress: "127.0.0.1" });
	 * if (result instanceof Error) {
	 * 	// handle UnexpectedError
	 * }
	 * setCookie(c, "session", result.token, {
	 * 	httpOnly: true,
	 * 	secure: true,
	 * 	sameSite: "Lax",
	 * 	path: "/",
	 * });
	 * ```
	 *
	 * @param userId - The id of the user the session belongs to.
	 * @param attributes - Session attributes to store.
	 * @returns The session token and value, or an {@link UnexpectedError} on failure.
	 */
	async create(userId: string, attributes: Insert): Promise<{ token: string; value: Session<SessionAttrs> } | UnexpectedError> {
		try {
			const now = new Date();

			const id = generateSessionId();
			const secret = generateSessionId();
			const secretHash = await hashSecret(secret);

			const token = `${id}.${secret}`;

			const insertResult = await this.adapter.insertSession({
				id,
				userId,
				secretHash,
				createdAt: now,
				lastVerifiedAt: now,
				attributes: stripSessionReservedAttributes(attributes),
			});
			if (insertResult instanceof Error) {
				return new UnexpectedError(insertResult);
			}

			return {
				token,
				value: this.toPublicSession(insertResult),
			};
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}

	/**
	 * Validates a session token and returns the session and its user.
	 *
	 * - Returns `null` when the token is malformed, the session does not
	 *   exist, the secret is wrong, or the session has expired.
	 * - Deletes expired sessions and refreshes `lastVerifiedAt` when the
	 *   {@link NyxOptions.session.activityCheckInterval} has elapsed.
	 *
	 * ### Example
	 *
	 * ```ts
	 * const result = await nyx.session.validateToken(token);
	 * if (result instanceof Error) {
	 * 	// handle UnexpectedError
	 * }
	 * if (!result) {
	 * 	// not authenticated
	 * }
	 * const { session, user } = result;
	 * ```
	 *
	 * @param token - The session token, e.g. read from a cookie.
	 * @returns The validated session and its user, `null` if invalid, or an {@link UnexpectedError} on failure.
	 */
	async validateToken(token: string): Promise<{ session: Session<SessionAttrs>; user: User<UserAttrs> } | null | UnexpectedError> {
		try {
			return await this.validateTokenInternal(token);
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}

	private async validateTokenInternal(token: string): Promise<{ session: Session<SessionAttrs>; user: User<UserAttrs> } | null | UnexpectedError> {
		if (!SESSION_TOKEN_PATTERN.test(token)) return null;

		const tokenParts = token.split(".");
		const sessionId = tokenParts[0];
		const sessionSecret = tokenParts[1];
		if (!sessionId || !sessionSecret) return null;

		const now = new Date();

		const combined = await this.adapter.findSessionWithUserById(sessionId);
		if (combined instanceof Error) {
			return new UnexpectedError(combined);
		}
		if (!combined) {
			// Timing equalization: the real path below hashes the supplied
			// secret and constant-time compares it against the stored hash.
			// Returning early here would make the "session id not found" case
			// measurably faster than the "wrong secret" case, letting an
			// attacker probe which session ids exist via response timing.
			await this.compareWithDummySecret(sessionSecret);
			return null;
		}

		const { session: dbSession, user: dbUser } = combined;

		// The session ID is not a credential — the secret is the proof. Verify
		// it before any state mutation (expiry deletion) so the session can
		// only be acted upon by its holder. This also keeps the hashing work
		// uniform across all "session found" paths, matching the dummy-hash
		// path above.
		const tokenSecretHash = await hashSecret(sessionSecret);
		const validSecret = constantTimeEqual(tokenSecretHash, dbSession.secretHash);
		if (!validSecret) {
			return null;
		}

		const activeSession = await this.checkSessionExpiry(dbSession, now);
		if (activeSession instanceof Error) {
			return activeSession;
		}
		if (!activeSession) {
			return null;
		}

		let lastVerifiedAt = dbSession.lastVerifiedAt;
		if (this.activityCheckInterval.elapsedSince(dbSession.lastVerifiedAt, now)) {
			const result = await this.adapter.updateSessionbyId(dbSession.id, { lastVerifiedAt: now });
			// The refresh is a best-effort write: if it fails, the session
			// stays valid and keeps its previous lastVerifiedAt.
			if (!(result instanceof Error)) {
				lastVerifiedAt = now;
			}
		}

		return {
			session: this.toPublicSession(dbSession, lastVerifiedAt),
			user: {
				...this.mapUserAttributes(dbUser.attributes),
				id: dbUser.id,
			},
		};
	}

	/**
	 * Deletes a session by its id.
	 *
	 * ### Example
	 *
	 * ```ts
	 * const result = await nyx.session.validateToken(token);
	 * if (result && !(result instanceof Error)) {
	 * 	await nyx.session.invalidate(result.session.id);
	 * }
	 * ```
	 *
	 * @param id - The id of the session to delete.
	 * @returns `true` if the session was deleted, `false` if it did not exist, or an {@link UnexpectedError} on failure.
	 */
	async invalidate(id: string): Promise<boolean | UnexpectedError> {
		try {
			const result = await this.adapter.deleteSessionById(id);
			if (result instanceof Error) {
				return new UnexpectedError(result);
			}
			return result;
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}

	/**
	 * Deletes all sessions belonging to a user.
	 *
	 * Use this for "sign out everywhere". Note that
	 * {@link UserAPI#delete} already invalidates the user's sessions.
	 *
	 * @param userId - The id of the user whose sessions to delete.
	 * @returns `true` if at least one session was deleted, `false` otherwise, or an {@link UnexpectedError} on failure.
	 */
	async invalidateAll(userId: string): Promise<boolean | UnexpectedError> {
		try {
			const result = await this.adapter.deleteSessionsByUserId(userId);
			if (result instanceof Error) {
				return new UnexpectedError(result);
			}
			return result;
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}

	/**
	 * Updates the attributes of a session.
	 *
	 * @param sessionId - The id of the session to update.
	 * @param attributes - The attributes to update. Reserved columns (`id`,
	 * `userId`, `secretHash`, `createdAt`, `lastVerifiedAt`) are ignored.
	 * @returns `undefined` on success, or an {@link UnexpectedError} on failure.
	 */
	async updateAttributes(sessionId: string, attributes: Partial<Select>): Promise<undefined | UnexpectedError> {
		try {
			const result = await this.adapter.updateSessionbyId(sessionId, {
				attributes: stripSessionReservedAttributes(attributes),
			});
			if (result instanceof Error) {
				return new UnexpectedError(result);
			}
			return undefined;
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}

	private async checkSessionExpiry(session: DatabaseSession<Select>, now: Date): Promise<DatabaseSession<Select> | null | UnexpectedError> {
		if (this.inactivityTimeout.elapsedSince(session.lastVerifiedAt, now)) {
			const deleteResult = await this.adapter.deleteSessionById(session.id);
			if (deleteResult instanceof Error) {
				return new UnexpectedError(deleteResult);
			}
			return null;
		}
		return session;
	}

	// Performs the same cryptographic work as the real secret verification
	// (SHA-256 hash + constant-time comparison) against a static dummy hash,
	// and discards the result. This closes the timing oracle on session id
	// existence: callers cannot distinguish "session not found" from
	// "session found, wrong secret".
	private async compareWithDummySecret(secret: string): Promise<void> {
		const secretHash = await hashSecret(secret);
		void constantTimeEqual(secretHash, DUMMY_SECRET_HASH);
	}

	private toPublicSession(session: DatabaseSession<Select>, lastVerifiedAt: Date = session.lastVerifiedAt): Session<SessionAttrs> {
		// The mapped attributes are spread first so they can never override the
		// base fields managed by nyx-auth (id, userId, createdAt, lastVerifiedAt).
		return {
			...this.mapSessionAttributes(session.attributes),
			id: session.id,
			userId: session.userId,
			createdAt: session.createdAt,
			lastVerifiedAt,
		};
	}
}
