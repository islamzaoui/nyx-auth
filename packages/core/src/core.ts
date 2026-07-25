import { type Adapter, AdapterError } from "./adapter";
import { TimeSpan } from "./time-span";
import type { Session, SessionWithToken } from "./types";

export class UnexpectedError extends Error {
	override readonly name = "UnexpectedError";
	constructor(cause: unknown) {
		super("An unexpected error occurred", { cause });
	}
}

export interface NyxOptions<DB extends {} = Record<never, never>, Attributes extends {} = Record<never, never>> {
	adapter: Adapter<DB>;
	session?: {
		inactivityTimeout?: TimeSpan;
		activityCheckInterval?: TimeSpan;
		getSessionAttributes?: (databaseSessionAttributes: DB) => Attributes;
	};
}

export class Nyx<DB extends {} = Record<never, never>, Attributes extends {} = Record<never, never>> {
	private readonly adapter: Adapter<DB>;
	private readonly inactivityTimeout: TimeSpan;
	private readonly activityCheckInterval: TimeSpan;
	private readonly getSessionAttributes: (databaseSessionAttributes: DB) => Attributes;

	constructor(options: NyxOptions<DB, Attributes>) {
		this.adapter = options.adapter;
		this.inactivityTimeout = options.session?.inactivityTimeout ?? new TimeSpan(10, "d");
		this.activityCheckInterval = options.session?.activityCheckInterval ?? new TimeSpan(1, "h");
		this.getSessionAttributes = (attr: DB): Attributes => {
			if (options.session?.getSessionAttributes) return options.session.getSessionAttributes(attr);
			return {} as Attributes;
		};
	}

	async createSession(userId: string, attributes: Attributes): Promise<SessionWithToken<Attributes> | UnexpectedError> {
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
			attributes: attributes as unknown as DB,
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
			...attributes,
		};
	}

	async getSession(id: string): Promise<Session<Attributes> | null | UnexpectedError> {
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

		return {
			id: session.id,
			userId: session.userId,
			secretHash: session.secretHash,
			createdAt: session.createdAt,
			lastVerifiedAt: session.lastVerifiedAt,
			...this.getSessionAttributes(session.attributes),
		};
	}

	async validateSessionToken(token: string): Promise<Session<Attributes> | null | UnexpectedError> {
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
