import { type Adapter, AdapterError, type Attributes, type DatabaseSession } from "../adapter";
import { UnexpectedError } from "../errors";
import type { TimeSpan } from "../time-span";
import { stripSessionReservedAttributes } from "../utils/attributes";
import { constantTimeEqual, generateSessionId, hashSecret } from "../utils/crypto";
import type { Session, User } from "../utils/types";

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

	get $infer(): Session<SessionAttrs> {
		return {} as Session<SessionAttrs>;
	}

	async create(userId: string, attributes: Insert): Promise<{ token: string; value: Session<SessionAttrs> } | UnexpectedError> {
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
		if (insertResult instanceof AdapterError) {
			return new UnexpectedError(insertResult);
		}

		return {
			token,
			value: {
				id: insertResult.id,
				userId: insertResult.userId,
				createdAt: insertResult.createdAt,
				lastVerifiedAt: insertResult.lastVerifiedAt,
				...this.mapSessionAttributes(insertResult.attributes),
			},
		};
	}

	async get(id: string): Promise<Session<SessionAttrs> | null | UnexpectedError> {
		const session = await this.getRawSession(id);
		if (session instanceof Error) {
			return session;
		}
		if (!session) return null;

		return {
			id: session.id,
			userId: session.userId,
			createdAt: session.createdAt,
			lastVerifiedAt: session.lastVerifiedAt,
			...this.mapSessionAttributes(session.attributes),
		};
	}

	async validateToken(token: string): Promise<{ session: Session<SessionAttrs>; user: User<UserAttrs> } | null | UnexpectedError> {
		try {
			return await this.validateTokenInternal(token);
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}

	private async validateTokenInternal(token: string): Promise<{ session: Session<SessionAttrs>; user: User<UserAttrs> } | null | UnexpectedError> {
		const now = new Date();

		const tokenParts = token.split(".");
		if (tokenParts.length !== 2) return null;

		const sessionId = tokenParts[0];
		const sessionSecret = tokenParts[1];
		if (!sessionId || !sessionSecret) return null;

		const combined = await this.adapter.findSessionWithUserById(sessionId);
		if (combined instanceof AdapterError) {
			return new UnexpectedError(combined);
		}
		if (!combined) return null;

		const { session: dbSession, user: dbUser } = combined;

		if (this.inactivityTimeout.elapsedSince(dbSession.lastVerifiedAt, now)) {
			const deleteResult = await this.adapter.deleteSessionById(dbSession.id);
			if (deleteResult instanceof Error) {
				return new UnexpectedError(deleteResult);
			}
			return null;
		}

		const tokenSecretHash = await hashSecret(sessionSecret);
		const validSecret = constantTimeEqual(tokenSecretHash, dbSession.secretHash);
		if (!validSecret) {
			return null;
		}

		let lastVerifiedAt = dbSession.lastVerifiedAt;
		if (this.activityCheckInterval.elapsedSince(dbSession.lastVerifiedAt, now)) {
			lastVerifiedAt = now;
			const result = await this.adapter.updateSessionbyId(dbSession.id, { lastVerifiedAt: now });
			if (result instanceof Error) {
				return new UnexpectedError(result);
			}
		}

		return {
			session: {
				id: dbSession.id,
				userId: dbSession.userId,
				createdAt: dbSession.createdAt,
				lastVerifiedAt,
				...this.mapSessionAttributes(dbSession.attributes),
			},
			user: {
				id: dbUser.id,
				...this.mapUserAttributes(dbUser.attributes),
			},
		};
	}

	async invalidate(id: string): Promise<undefined | UnexpectedError> {
		const result = await this.adapter.deleteSessionById(id);
		if (result instanceof Error) {
			return new UnexpectedError(result);
		}
		return undefined;
	}

	async invalidateAll(userId: string): Promise<undefined | UnexpectedError> {
		const result = await this.adapter.deleteSessionsByUserId(userId);
		if (result instanceof Error) {
			return new UnexpectedError(result);
		}
		return undefined;
	}

	async updateAttributes(sessionId: string, attributes: Partial<Select>): Promise<undefined | UnexpectedError> {
		const result = await this.adapter.updateSessionbyId(sessionId, {
			attributes: stripSessionReservedAttributes(attributes),
		});
		if (result instanceof Error) {
			return new UnexpectedError(result);
		}
		return undefined;
	}

	private async getRawSession(id: string): Promise<DatabaseSession<Select> | null | UnexpectedError> {
		try {
			const now = new Date();

			const session = await this.adapter.findSessionById(id);
			if (session instanceof Error) {
				return new UnexpectedError(session);
			}

			if (!session) return null;

			if (this.inactivityTimeout.elapsedSince(session.lastVerifiedAt, now)) {
				const deleteResult = await this.adapter.deleteSessionById(session.id);
				if (deleteResult instanceof Error) {
					return new UnexpectedError(deleteResult);
				}
				return null;
			}

			return session;
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}
}
