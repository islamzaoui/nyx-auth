import type { RegisteredDatabaseSessionAttributes } from "@/index";

export interface DatabaseSession {
	id: string;
	userId: string;
	secretHash: Uint8Array;
	createdAt: Date;
	lastVerifiedAt: Date;
	attributes: RegisteredDatabaseSessionAttributes;
}

export class AdapterError extends Error {
	override readonly name = "AdapterError";
	constructor(opt: { operation: string; cause: unknown }) {
		super(`Adapter operation "${opt.operation}" failed`, {
			cause: opt.cause,
		});
	}
}

export interface Adapter {
	insertSession(session: DatabaseSession): Promise<undefined | AdapterError>;
	findSessionById(sessionId: string): Promise<DatabaseSession | null | AdapterError>;
	updateSessionbyId(sessionId: string, session: Partial<Omit<DatabaseSession, "id" | "userId">>): Promise<undefined | AdapterError>;
	deleteSessionById(sessionId: string): Promise<undefined | AdapterError>;
	deleteSessionsByUserId(userId: string): Promise<undefined | AdapterError>;
}
