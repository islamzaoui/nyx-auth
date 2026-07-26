import { type Adapter, AdapterError, type Attributes, type DatabaseSession, type DatabaseUser } from "@nyx-auth/core";
import { eq } from "drizzle-orm";
import type { PgColumn, PgDatabase, PgTableWithColumns } from "drizzle-orm/pg-core";

type AttributeColumn<T> = PgColumn<{
	dataType: any;
	columnType: any;
	notNull: boolean;
	hasDefault: boolean;
	data: T;
	driverParam: any;
	name: any;
	tableName: any;
	enumValues: any;
	baseColumn: any;
	isPrimaryKey: boolean;
	isAutoincrement: boolean;
	hasRuntimeDefault: boolean;
	generated: any;
}>;

type BaseColumns = {
	id: PgColumn<{
		dataType: any;
		columnType: any;
		notNull: true;
		hasDefault: boolean;
		data: string;
		driverParam: any;
		name: any;
		tableName: any;
		enumValues: any;
		baseColumn: any;
		isPrimaryKey: any;
		isAutoincrement: any;
		hasRuntimeDefault: any;
		generated: any;
	}>;
	userId: PgColumn<{
		dataType: any;
		columnType: any;
		notNull: true;
		hasDefault: boolean;
		data: string;
		driverParam: any;
		name: any;
		tableName: any;
		enumValues: any;
		baseColumn: any;
		isPrimaryKey: any;
		isAutoincrement: any;
		hasRuntimeDefault: any;
		generated: any;
	}>;
	secretHash: PgColumn<{
		dataType: any;
		columnType: any;
		notNull: true;
		hasDefault: boolean;
		data: Uint8Array;
		driverParam: any;
		name: any;
		tableName: any;
		enumValues: any;
		baseColumn: any;
		isPrimaryKey: any;
		isAutoincrement: any;
		hasRuntimeDefault: any;
		generated: any;
	}>;
	createdAt: PgColumn<{
		dataType: any;
		columnType: any;
		notNull: true;
		hasDefault: boolean;
		data: Date;
		driverParam: any;
		name: any;
		tableName: any;
		enumValues: any;
		baseColumn: any;
		isPrimaryKey: any;
		isAutoincrement: any;
		hasRuntimeDefault: any;
		generated: any;
	}>;
	lastVerifiedAt: PgColumn<{
		dataType: any;
		columnType: any;
		notNull: true;
		hasDefault: boolean;
		data: Date;
		driverParam: any;
		name: any;
		tableName: any;
		enumValues: any;
		baseColumn: any;
		isPrimaryKey: any;
		isAutoincrement: any;
		hasRuntimeDefault: any;
		generated: any;
	}>;
};

type UserBaseColumns = {
	id: PgColumn<{
		dataType: any;
		columnType: any;
		notNull: true;
		hasDefault: boolean;
		data: string;
		driverParam: any;
		name: any;
		tableName: any;
		enumValues: any;
		baseColumn: any;
		isPrimaryKey: any;
		isAutoincrement: any;
		hasRuntimeDefault: any;
		generated: any;
	}>;
};

export type PgSessionTable<A extends Record<string, any> = Record<never, never>> = PgTableWithColumns<{
	dialect: "pg";
	columns: BaseColumns & { [K in keyof A as K extends keyof BaseColumns ? never : K]: AttributeColumn<A[K]> };
	schema: any;
	name: any;
}>;

export type PgUserTable<A extends Record<string, any> = Record<never, never>> = PgTableWithColumns<{
	dialect: "pg";
	columns: UserBaseColumns & { [K in keyof A as K extends keyof UserBaseColumns ? never : K]: AttributeColumn<A[K]> };
	schema: any;
	name: any;
}>;

export function createPostgresAdapter<A extends Attributes, UA extends Attributes>(
	db: PgDatabase<any, any, any>,
	sessionTable: PgSessionTable,
	userTable: PgUserTable
): Adapter<A, UA> {
	return new PostgresCoreAdapter<A, UA>(db, sessionTable, userTable);
}

class PostgresCoreAdapter<A extends Attributes, UA extends Attributes> implements Adapter<A, UA> {
	private db: PgDatabase<any, any, any>;
	private sessionTable: PgSessionTable;
	private userTable: PgUserTable;

	constructor(db: PgDatabase<any, any, any>, sessionTable: PgSessionTable, userTable: PgUserTable) {
		this.db = db;
		this.sessionTable = sessionTable;
		this.userTable = userTable;
	}

	async insertSession(session: DatabaseSession<A["insert"]>): Promise<DatabaseSession<A["select"]> | AdapterError> {
		try {
			const [row] = await this.db
				.insert(this.sessionTable)
				.values({
					id: session.id,
					userId: session.userId,
					secretHash: session.secretHash,
					createdAt: session.createdAt,
					lastVerifiedAt: session.lastVerifiedAt,
					...session.attributes,
				})
				.returning();
			if (!row) return new AdapterError({ operation: "insertSession", cause: new Error("Failed to retrieve inserted session") });
			return mapRowToSession<A["select"]>(row);
		} catch (cause) {
			return new AdapterError({ operation: "insertSession", cause });
		}
	}

	async findSessionById(sessionId: string): Promise<DatabaseSession<A["select"]> | null | AdapterError> {
		try {
			const [row] = await this.db.select().from(this.sessionTable).where(eq(this.sessionTable.id, sessionId));
			if (!row) return null;
			return mapRowToSession<A["select"]>(row);
		} catch (cause) {
			return new AdapterError({ operation: "findSessionById", cause });
		}
	}

	async updateSessionbyId(
		sessionId: string,
		session: Partial<Omit<DatabaseSession<Partial<A["select"]>>, "id" | "userId">>
	): Promise<undefined | AdapterError> {
		try {
			const [row] = await this.db.select().from(this.sessionTable).where(eq(this.sessionTable.id, sessionId));
			if (!row) return undefined;

			const existingSession = mapRowToSession<A["select"]>(row);
			const secretHash = session.secretHash ?? existingSession.secretHash;
			const createdAt = session.createdAt ?? existingSession.createdAt;
			const lastVerifiedAt = session.lastVerifiedAt ?? existingSession.lastVerifiedAt;
			const attributes = { ...existingSession.attributes, ...session.attributes };

			await this.db
				.update(this.sessionTable)
				.set({
					secretHash,
					createdAt,
					lastVerifiedAt,
					...attributes,
				})
				.where(eq(this.sessionTable.id, sessionId));
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "updateSessionbyId", cause });
		}
	}

	async deleteSessionById(sessionId: string): Promise<undefined | AdapterError> {
		try {
			await this.db.delete(this.sessionTable).where(eq(this.sessionTable.id, sessionId));
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "deleteSessionById", cause });
		}
	}

	async deleteSessionsByUserId(userId: string): Promise<undefined | AdapterError> {
		try {
			await this.db.delete(this.sessionTable).where(eq(this.sessionTable.userId, userId));
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "deleteSessionsByUserId", cause });
		}
	}

	async insertUser(user: DatabaseUser<UA["insert"]>): Promise<DatabaseUser<UA["select"]> | AdapterError> {
		try {
			const [row] = await this.db
				.insert(this.userTable)
				.values({
					id: user.id,
					...user.attributes,
				})
				.returning();
			if (!row) return new AdapterError({ operation: "insertUser", cause: new Error("Failed to retrieve inserted user") });
			return mapRowToUser<UA["select"]>(row);
		} catch (cause) {
			return new AdapterError({ operation: "insertUser", cause });
		}
	}

	async findUserById(userId: string): Promise<DatabaseUser<UA["select"]> | null | AdapterError> {
		try {
			const [row] = await this.db.select().from(this.userTable).where(eq(this.userTable.id, userId));
			if (!row) return null;
			return mapRowToUser<UA["select"]>(row);
		} catch (cause) {
			return new AdapterError({ operation: "findUserById", cause });
		}
	}

	async updateUserbyId(userId: string, user: Partial<Omit<DatabaseUser<Partial<UA["select"]>>, "id">>): Promise<undefined | AdapterError> {
		try {
			const [row] = await this.db.select().from(this.userTable).where(eq(this.userTable.id, userId));
			if (!row) return undefined;

			const existingUser = mapRowToUser<UA["select"]>(row);
			const attributes = { ...existingUser.attributes, ...user.attributes };

			await this.db.update(this.userTable).set(attributes).where(eq(this.userTable.id, userId));
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "updateUserbyId", cause });
		}
	}

	async deleteUserById(userId: string): Promise<undefined | AdapterError> {
		try {
			await this.db.delete(this.userTable).where(eq(this.userTable.id, userId));
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "deleteUserById", cause });
		}
	}

	async findSessionWithUserById(
		sessionId: string
	): Promise<{ session: DatabaseSession<A["select"]>; user: DatabaseUser<UA["select"]> } | null | AdapterError> {
		try {
			const [row] = (await this.db
				.select()
				.from(this.sessionTable)
				.innerJoin(this.userTable, eq(this.sessionTable.userId, this.userTable.id))
				.where(eq(this.sessionTable.id, sessionId))) as unknown as { session: Record<string, unknown>; user: Record<string, unknown> }[];
			if (!row) return null;

			const dbSession = mapRowToSession<A["select"]>(row.session);
			const dbUser = mapRowToUser<UA["select"]>(row.user);

			return { session: dbSession, user: dbUser };
		} catch (cause) {
			return new AdapterError({ operation: "findSessionWithUserById", cause });
		}
	}
}

function mapRowToSession<A extends Record<string, any>>(row: Record<string, any>): DatabaseSession<A> {
	const { id, userId, secretHash, createdAt, lastVerifiedAt, ...attributes } = row;
	return {
		id,
		userId,
		secretHash,
		createdAt,
		lastVerifiedAt,
		attributes: attributes as A,
	};
}

function mapRowToUser<A extends Record<string, any>>(row: Record<string, any>): DatabaseUser<A> {
	const { id, ...attributes } = row;
	return {
		id,
		attributes: attributes as A,
	};
}
