import { type Adapter, AdapterError, type Attributes, type DatabaseSession, type DatabaseUser } from "@nyx-auth/core";
import { eq, getTableName } from "drizzle-orm";
import type { BaseSQLiteDatabase, SQLiteColumn, SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import { stripSessionReservedAttributes, stripUserReservedAttributes } from "./sanitize";

type AttributeColumn<T> = SQLiteColumn<{
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
	id: SQLiteColumn<{
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
	userId: SQLiteColumn<{
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
	secretHash: SQLiteColumn<{
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
	createdAt: SQLiteColumn<{
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
	lastVerifiedAt: SQLiteColumn<{
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
	id: SQLiteColumn<{
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

export type SQLiteSessionTable<A extends Record<string, any> = Record<never, never>> = SQLiteTableWithColumns<{
	dialect: "sqlite";
	columns: BaseColumns & { [K in keyof A as K extends keyof BaseColumns ? never : K]: AttributeColumn<A[K]> };
	schema: any;
	name: any;
}>;

export type SQLiteUserTable<A extends Record<string, any> = Record<never, never>> = SQLiteTableWithColumns<{
	dialect: "sqlite";
	columns: UserBaseColumns & { [K in keyof A as K extends keyof UserBaseColumns ? never : K]: AttributeColumn<A[K]> };
	schema: any;
	name: any;
}>;

export function createSQLiteAdapter<A extends Attributes, UA extends Attributes>(
	db: BaseSQLiteDatabase<"async" | "sync", any>,
	sessionTable: SQLiteSessionTable,
	userTable: SQLiteUserTable
): Adapter<A, UA> {
	return new SQLiteCoreAdapter<A, UA>(db, sessionTable, userTable);
}

class SQLiteCoreAdapter<A extends Attributes, UA extends Attributes> implements Adapter<A, UA> {
	private db: BaseSQLiteDatabase<"async" | "sync", any>;
	private sessionTable: SQLiteSessionTable;
	private userTable: SQLiteUserTable;

	constructor(db: BaseSQLiteDatabase<"async" | "sync", any>, sessionTable: SQLiteSessionTable, userTable: SQLiteUserTable) {
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
					...stripSessionReservedAttributes(session.attributes),
				})
				.returning()
				.all();
			if (!row) return new AdapterError({ operation: "insertSession", cause: new Error("Failed to retrieve inserted session") });
			return mapRowToSession<A["select"]>(row);
		} catch (cause) {
			return new AdapterError({ operation: "insertSession", cause });
		}
	}

	async updateSessionbyId(
		sessionId: string,
		session: Partial<Omit<DatabaseSession<Partial<A["select"]>>, "id" | "userId">>
	): Promise<undefined | AdapterError> {
		try {
			const values: Record<string, unknown> = {
				...stripSessionReservedAttributes(session.attributes),
			};
			if (session.secretHash !== undefined) values.secretHash = session.secretHash;
			if (session.createdAt !== undefined) values.createdAt = session.createdAt;
			if (session.lastVerifiedAt !== undefined) values.lastVerifiedAt = session.lastVerifiedAt;

			if (Object.keys(values).length === 0) return undefined;

			await this.db.update(this.sessionTable).set(values).where(eq(this.sessionTable.id, sessionId)).run();
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "updateSessionbyId", cause });
		}
	}

	async deleteSessionById(sessionId: string): Promise<boolean | AdapterError> {
		try {
			const deleted = await this.db
				.delete(this.sessionTable)
				.where(eq(this.sessionTable.id, sessionId))
				.returning({ id: this.sessionTable.id })
				.all();
			return deleted.length > 0;
		} catch (cause) {
			return new AdapterError({ operation: "deleteSessionById", cause });
		}
	}

	async deleteSessionsByUserId(userId: string): Promise<boolean | AdapterError> {
		try {
			const deleted = await this.db
				.delete(this.sessionTable)
				.where(eq(this.sessionTable.userId, userId))
				.returning({ id: this.sessionTable.id })
				.all();
			return deleted.length > 0;
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
					...stripUserReservedAttributes(user.attributes),
				})
				.returning()
				.all();
			if (!row) return new AdapterError({ operation: "insertUser", cause: new Error("Failed to retrieve inserted user") });
			return mapRowToUser<UA["select"]>(row);
		} catch (cause) {
			return new AdapterError({ operation: "insertUser", cause });
		}
	}

	async findUserById(userId: string): Promise<DatabaseUser<UA["select"]> | null | AdapterError> {
		try {
			const row = await this.db.select().from(this.userTable).where(eq(this.userTable.id, userId)).get();
			if (!row) return null;
			return mapRowToUser<UA["select"]>(row);
		} catch (cause) {
			return new AdapterError({ operation: "findUserById", cause });
		}
	}

	async updateUserbyId(userId: string, user: Partial<Omit<DatabaseUser<Partial<UA["select"]>>, "id">>): Promise<undefined | AdapterError> {
		try {
			const values = stripUserReservedAttributes(user.attributes);
			if (Object.keys(values).length === 0) return undefined;

			await this.db.update(this.userTable).set(values).where(eq(this.userTable.id, userId)).run();
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "updateUserbyId", cause });
		}
	}

	async deleteUserById(userId: string): Promise<undefined | AdapterError> {
		try {
			await this.db.delete(this.userTable).where(eq(this.userTable.id, userId)).run();
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "deleteUserById", cause });
		}
	}

	async findSessionWithUserById(
		sessionId: string
	): Promise<{ session: DatabaseSession<A["select"]>; user: DatabaseUser<UA["select"]> } | null | AdapterError> {
		try {
			const row = (await this.db
				.select()
				.from(this.sessionTable)
				.innerJoin(this.userTable, eq(this.sessionTable.userId, this.userTable.id))
				.where(eq(this.sessionTable.id, sessionId))
				.get()) as Record<string, Record<string, unknown>> | undefined;
			if (!row) return null;

			const sessionTableName = getTableName(this.sessionTable);
			const userTableName = getTableName(this.userTable);

			const sessionRow = row[sessionTableName];
			const userRow = row[userTableName];
			if (!sessionRow || !userRow) return null;

			const dbSession = mapRowToSession<A["select"]>(sessionRow);
			const dbUser = mapRowToUser<UA["select"]>(userRow);

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
