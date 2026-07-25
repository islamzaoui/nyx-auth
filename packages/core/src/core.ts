import { type Adapter, AdapterError, type Attributes, type DatabaseSession } from "./adapter";
import { TimeSpan } from "./time-span";
import type { Session } from "./types";

export class UnexpectedError extends Error {
	override readonly name = "UnexpectedError";
	constructor(cause: unknown) {
		super("An unexpected error occurred", { cause });
	}
}

export interface NyxOptions<Select extends object = object, Insert extends object = object, SessionAttrs extends object = Select> {
	adapter: Adapter<Attributes<Select, Insert>>;
	session?: {
		inactivityTimeout?: TimeSpan;
		activityCheckInterval?: TimeSpan;
		mapSessionAttributes?: (databaseSessionAttributes: Select) => SessionAttrs;
	};
}

export class Nyx<Select extends object = object, Insert extends object = object, SessionAttrs extends object = Select> {
	private readonly adapter: Adapter<Attributes<Select, Insert>>;
	private readonly inactivityTimeout: TimeSpan;
	private readonly activityCheckInterval: TimeSpan;
	private readonly mapSessionAttributes: (databaseSessionAttributes: Select) => SessionAttrs;

	constructor(options: NyxOptions<Select, Insert, SessionAttrs>) {
		this.adapter = options.adapter;
		this.inactivityTimeout = options.session?.inactivityTimeout ?? new TimeSpan(10, "d");
		this.activityCheckInterval = options.session?.activityCheckInterval ?? new TimeSpan(1, "h");
		this.mapSessionAttributes = (attr: Select): SessionAttrs => {
			if (options.session?.mapSessionAttributes) return options.session.mapSessionAttributes(attr);
			return attr as unknown as SessionAttrs;
		};
	}

	get $inferSession(): Session<SessionAttrs> {
		return {} as Session<SessionAttrs>;
	}

	async createSession(userId: string, attributes: Insert): Promise<{ token: string; value: Session<SessionAttrs> } | UnexpectedError> {
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
			attributes,
		});
		if (insertResult instanceof AdapterError) {
			return new UnexpectedError({ cause: insertResult });
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

	private async getRawSession(id: string): Promise<DatabaseSession<Select> | null | UnexpectedError> {
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

	async getSession(id: string): Promise<Session<SessionAttrs> | null | UnexpectedError> {
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

	async validateSessionToken(token: string): Promise<Session<SessionAttrs> | null | UnexpectedError> {
		const now = new Date();

		const tokenParts = token.split(".");
		if (tokenParts.length !== 2) return null;

		const sessionId = tokenParts[0];
		const sessionSecret = tokenParts[1];
		if (!sessionId || !sessionSecret) return null;

		const dbSession = await this.getRawSession(sessionId);
		if (dbSession instanceof Error) {
			return dbSession;
		}
		if (!dbSession) return null;

		const tokenSecretHash = await this.hashSecret(sessionSecret);
		const validSecret = this.constantTimeEqual(tokenSecretHash, dbSession.secretHash);
		if (!validSecret) {
			return null;
		}

		let lastVerifiedAt = dbSession.lastVerifiedAt;
		if (this.activityCheckInterval.elapsedSince(dbSession.lastVerifiedAt, now)) {
			lastVerifiedAt = now;
			const result = await this.adapter.updateSessionbyId(dbSession.id, { lastVerifiedAt: now });
			if (result instanceof Error) {
				return new UnexpectedError({ cause: result });
			}
		}

		return {
			id: dbSession.id,
			userId: dbSession.userId,
			createdAt: dbSession.createdAt,
			lastVerifiedAt,
			...this.mapSessionAttributes(dbSession.attributes),
		};
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

	async updateSessionAttributes(sessionId: string, attributes: Partial<Select>): Promise<undefined | UnexpectedError> {
		const result = await this.adapter.updateSessionbyId(sessionId, { attributes });
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
