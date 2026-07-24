export interface DatabaseSession<Attributes extends {} = Record<never, never>> {
	id: string;
	userId: string;
	secretHash: Uint8Array;
	createdAt: Date;
	lastVerifiedAt: Date;
	attributes: Attributes;
}

export class AdapterError extends Error {
	override readonly name = "AdapterError";
	constructor(opt: { operation: string; cause: unknown }) {
		super(`Adapter operation "${opt.operation}" failed`, {
			cause: opt.cause,
		});
	}
}

export interface Adapter<Attributes extends {} = Record<never, never>> {
	insertSession(session: DatabaseSession<Attributes>): Promise<undefined | AdapterError>;
	findSessionById(sessionId: string): Promise<DatabaseSession<Attributes> | null | AdapterError>;
	updateSessionbyId(sessionId: string, session: Partial<Omit<DatabaseSession<Attributes>, "id" | "userId">>): Promise<undefined | AdapterError>;
	deleteSessionById(sessionId: string): Promise<undefined | AdapterError>;
	deleteSessionsByUserId(userId: string): Promise<undefined | AdapterError>;
}
