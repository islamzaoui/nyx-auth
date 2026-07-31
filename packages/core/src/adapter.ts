export type Attributes<Select extends object = object, Insert extends object = object> = {
	select: Select;
	insert: Insert;
};

export interface DatabaseSession<A extends object = object> {
	id: string;
	userId: string;
	secretHash: Uint8Array;
	createdAt: Date;
	lastVerifiedAt: Date;
	attributes: A;
}

export interface DatabaseUser<A extends object = object> {
	id: string;
	attributes: A;
}

export class AdapterError extends Error {
	override readonly name = "AdapterError";
	constructor(opt: { operation: string; cause: unknown }) {
		super(`Adapter operation "${opt.operation}" failed`, {
			cause: opt.cause,
		});
	}
}

export interface Adapter<A extends Attributes = Attributes, UA extends Attributes = Attributes> {
	insertSession(session: DatabaseSession<A["insert"]>): Promise<DatabaseSession<A["select"]> | AdapterError>;
	findSessionById(sessionId: string): Promise<DatabaseSession<A["select"]> | null | AdapterError>;
	updateSessionbyId(
		sessionId: string,
		session: Partial<Omit<DatabaseSession<Partial<A["select"]>>, "id" | "userId">>
	): Promise<undefined | AdapterError>;
	deleteSessionById(sessionId: string): Promise<boolean | AdapterError>;
	deleteSessionsByUserId(userId: string): Promise<boolean | AdapterError>;
	insertUser(user: DatabaseUser<UA["insert"]>): Promise<DatabaseUser<UA["select"]> | AdapterError>;
	findUserById(userId: string): Promise<DatabaseUser<UA["select"]> | null | AdapterError>;
	updateUserbyId(userId: string, user: Partial<Omit<DatabaseUser<Partial<UA["select"]>>, "id">>): Promise<undefined | AdapterError>;
	deleteUserById(userId: string): Promise<undefined | AdapterError>;
	findSessionWithUserById(
		sessionId: string
	): Promise<{ session: DatabaseSession<A["select"]>; user: DatabaseUser<UA["select"]> } | null | AdapterError>;
}
