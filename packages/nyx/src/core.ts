/** biome-ignore-all lint/suspicious/noExplicitAny: module augmentation */
import type { RegisteredDatabaseSessionAttributes } from ".";
import { type Adapter, AdapterError } from "./adapter";
import { TimeSpan } from "./time-span";
import type { Session, SessionAttributes, SessionWithToken } from "./types";

export class UnexpectedError extends Error {
	override readonly name = "UnexpectedError";
	constructor(cause: unknown) {
		super("An unexpected error occurred", { cause });
	}
}

export interface NyxOptions {
	adapter: Adapter;
	session?: {
		inactivityTimeout?: TimeSpan;
		activityCheckInterval?: TimeSpan;
		getSessionAttributes?: (databaseSessionAttributes: RegisteredDatabaseSessionAttributes) => SessionAttributes;
	};
}

export class Nyx<_SessionAttributes extends {} = Record<never, never>> {
	private readonly adapter: Adapter;
	private readonly inactivityTimeout: TimeSpan;
	private readonly activityCheckInterval: TimeSpan;
	private readonly getSessionAttributes: (databaseSessionAttributes: RegisteredDatabaseSessionAttributes) => _SessionAttributes;

	constructor(options: NyxOptions) {
		this.adapter = options.adapter;
		this.inactivityTimeout = options.session?.inactivityTimeout ?? new TimeSpan(10, "d");
		this.activityCheckInterval = options.session?.activityCheckInterval ?? new TimeSpan(1, "h");
		this.getSessionAttributes = (attr): any => {
			if (options.session?.getSessionAttributes) return options.session.getSessionAttributes(attr);
			return {};
		};
	}

	// ========== Session Management ==========

	async createSession(userId: string, attributes: RegisteredDatabaseSessionAttributes): Promise<SessionWithToken | UnexpectedError> {
		const now = new Date();

		const id = this.generateSessionId();
		const secret = this.generateSessionId();
		const secretHash = await this.hashSecret(secret);

		const token = `${id}.${secret}`;

		const insertResult = await this.adapter.insertSession({
			id,
			userId,
			secretHash,
			createdAt: now,
			lastVerifiedAt: now,
			attributes: this.getSessionAttributes(attributes),
		});
		if (insertResult instanceof AdapterError) {
			return new UnexpectedError({ cause: insertResult });
		}

		return {
			id,
			userId,
			token,
			createdAt: now,
			lastVerifiedAt: now,
			...this.getSessionAttributes(attributes),
		};
	}

	async getSession(id: string): Promise<Session | null | UnexpectedError> {
		const now = new Date();

		const session = await this.adapter.findSessionById(id);
		if (session instanceof Error) {
			return new UnexpectedError({ cause: session });
		}

		if (!session) return null;

		if (this.inactivityTimeout.elapsedSince(session.lastVerifiedAt, now)) {
			await this.adapter.deleteSessionById(session.id);
			return null;
		}

		return session;
	}

	async validateSessionToken(token: string): Promise<Session | null | UnexpectedError> {
		const now = new Date();

		const tokenParts = token.split(".");
		if (tokenParts.length !== 2) return null;

		const sessionId = tokenParts[0];
		const sessionSecret = tokenParts[1];
		if (!sessionId || !sessionSecret) return null;

		const session = await this.getSession(sessionId);
		if (session instanceof Error) {
			return new UnexpectedError({ cause: session });
		}

		if (!session) {
			return null;
		}

		const tokenSecretHash = await this.hashSecret(sessionSecret);
		const validSecret = this.constantTimeEqual(tokenSecretHash, session.secretHash);
		if (!validSecret) {
			return null;
		}

		if (this.activityCheckInterval.elapsedSince(session.lastVerifiedAt, now)) {
			session.lastVerifiedAt = now;
			const result = await this.adapter.updateSessionbyId(session.id, { lastVerifiedAt: now });
			if (result instanceof Error) {
				return new UnexpectedError({ cause: result });
			}
		}

		return session;
	}

	async invalidateSession(id: string): Promise<undefined | UnexpectedError> {
		const result = await this.adapter.deleteSessionById(id);
		if (result instanceof Error) {
			return new UnexpectedError({ cause: result });
		}
		return undefined;
	}

	async invalidateUserSessions(userId: string): Promise<undefined | UnexpectedError> {
		const result = await this.adapter.deleteSessionsByUserId(userId);
		if (result instanceof Error) {
			return new UnexpectedError({ cause: result });
		}
		return undefined;
	}

	// ========== helpers ==========

	private generateSessionId(): string {
		const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
		const bytes = new Uint8Array(24);
		crypto.getRandomValues(bytes);

		let id = "";
		for (const b of bytes) {
			id += alphabet[b >> 3];
		}
		return id;
	}

	private async hashSecret(secret: string): Promise<Buffer> {
		const secretBytes = new TextEncoder().encode(secret);
		const secretHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
		return Buffer.from(secretHashBuffer);
	}

	private constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
		if (a.byteLength !== b.byteLength) {
			return false;
		}

		let c = 0;
		const bIterator = b.values();
		for (const aByte of a) {
			const next = bIterator.next();
			if (next.done) {
				return false;
			}
			c |= aByte ^ next.value;
		}

		return c === 0;
	}
}
