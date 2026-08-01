import { type Adapter, AdapterError, type Attributes, type DatabaseSession, type DatabaseUser } from "@nyx-auth/core";
import { eq, getTableName, lte } from "drizzle-orm";
import type { BaseSQLiteDatabase, SQLiteColumn, SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import { isSecretHash, stripSessionReservedAttributes, stripUserReservedAttributes } from "./sanitize";

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

/**
 * A SQLite session table definition.
 *
 * Requires base columns `id`, `userId`, `secretHash`, `createdAt` and
 * `lastVerifiedAt`; any additional columns are treated as session
 * attributes.
 *
 * @typeParam A - The session attribute columns, inferred from your table.
 */
export type SQLiteSessionTable<A extends Record<string, any> = Record<never, never>> = SQLiteTableWithColumns<{
	dialect: "sqlite";
	columns: BaseColumns & { [K in keyof A as K extends keyof BaseColumns ? never : K]: AttributeColumn<A[K]> };
	schema: any;
	name: any;
}>;

/**
 * A SQLite user table definition.
 *
 * Requires a base `id` column; any additional columns are treated as user
 * attributes.
 *
 * @typeParam A - The user attribute columns, inferred from your table.
 */
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
		return Promise.resolve(
			this.db
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
				.all()
		)
			.then(([row]) =>
				row
					? mapRowToSession<A["select"]>(row)
					: new AdapterError({ operation: "insertSession", cause: new Error("Failed to retrieve inserted session") })
			)
			.catch((cause) => new AdapterError({ operation: "insertSession", cause }));
	}

	async updateSessionbyId(
		sessionId: string,
		session: Partial<Omit<DatabaseSession<Partial<A["select"]>>, "id" | "userId">>
	): Promise<undefined | AdapterError> {
		const values: Record<string, unknown> = {
			...stripSessionReservedAttributes(session.attributes),
		};
		if (session.secretHash !== undefined) values.secretHash = session.secretHash;
		if (session.createdAt !== undefined) values.createdAt = session.createdAt;
		if (session.lastVerifiedAt !== undefined) values.lastVerifiedAt = session.lastVerifiedAt;

		if (Object.keys(values).length === 0) return undefined;

		return Promise.resolve(this.db.update(this.sessionTable).set(values).where(eq(this.sessionTable.id, sessionId)).run())
			.then(() => undefined)
			.catch((cause) => new AdapterError({ operation: "updateSessionbyId", cause }));
	}

	async deleteSessionById(sessionId: string): Promise<boolean | AdapterError> {
		return Promise.resolve(this.db.delete(this.sessionTable).where(eq(this.sessionTable.id, sessionId)).returning({ id: this.sessionTable.id }).all())
			.then((deleted) => deleted.length > 0)
			.catch((cause) => new AdapterError({ operation: "deleteSessionById", cause }));
	}

	async deleteSessionsByUserId(userId: string): Promise<boolean | AdapterError> {
		return Promise.resolve(
			this.db.delete(this.sessionTable).where(eq(this.sessionTable.userId, userId)).returning({ id: this.sessionTable.id }).all()
		)
			.then((deleted) => deleted.length > 0)
			.catch((cause) => new AdapterError({ operation: "deleteSessionsByUserId", cause }));
	}

	async deleteExpiredSessions(olderThan: Date): Promise<number | AdapterError> {
		return Promise.resolve(
			this.db.delete(this.sessionTable).where(lte(this.sessionTable.lastVerifiedAt, olderThan)).returning({ id: this.sessionTable.id }).all()
		)
			.then((deleted) => deleted.length)
			.catch((cause) => new AdapterError({ operation: "deleteExpiredSessions", cause }));
	}

	async insertUser(user: DatabaseUser<UA["insert"]>): Promise<DatabaseUser<UA["select"]> | AdapterError> {
		return Promise.resolve(
			this.db
				.insert(this.userTable)
				.values({
					id: user.id,
					...stripUserReservedAttributes(user.attributes),
				})
				.returning()
				.all()
		)
			.then(([row]) =>
				row ? mapRowToUser<UA["select"]>(row) : new AdapterError({ operation: "insertUser", cause: new Error("Failed to retrieve inserted user") })
			)
			.catch((cause) => new AdapterError({ operation: "insertUser", cause }));
	}

	async findUserById(userId: string): Promise<DatabaseUser<UA["select"]> | null | AdapterError> {
		return Promise.resolve(this.db.select().from(this.userTable).where(eq(this.userTable.id, userId)).get())
			.then((row) => {
				if (!row) return null;
				return mapRowToUser<UA["select"]>(row);
			})
			.catch((cause) => new AdapterError({ operation: "findUserById", cause }));
	}

	async updateUserbyId(userId: string, user: Partial<Omit<DatabaseUser<Partial<UA["select"]>>, "id">>): Promise<undefined | AdapterError> {
		const values = stripUserReservedAttributes(user.attributes);
		if (Object.keys(values).length === 0) return undefined;

		return Promise.resolve(this.db.update(this.userTable).set(values).where(eq(this.userTable.id, userId)).run())
			.then(() => undefined)
			.catch((cause) => new AdapterError({ operation: "updateUserbyId", cause }));
	}

	async deleteUserById(userId: string): Promise<undefined | AdapterError> {
		return Promise.resolve(this.db.delete(this.userTable).where(eq(this.userTable.id, userId)).run())
			.then(() => undefined)
			.catch((cause) => new AdapterError({ operation: "deleteUserById", cause }));
	}

	async findSessionWithUserById(
		sessionId: string
	): Promise<{ session: DatabaseSession<A["select"]>; user: DatabaseUser<UA["select"]> } | null | AdapterError> {
		return Promise.resolve(
			this.db
				.select()
				.from(this.sessionTable)
				.innerJoin(this.userTable, eq(this.sessionTable.userId, this.userTable.id))
				.where(eq(this.sessionTable.id, sessionId))
				.get()
		)
			.then((row) => {
				const result = row as Record<string, Record<string, unknown>> | undefined;
				if (!result) return null;

				const sessionTableName = getTableName(this.sessionTable);
				const userTableName = getTableName(this.userTable);

				const sessionRow = result[sessionTableName];
				const userRow = result[userTableName];
				if (!sessionRow || !userRow) return null;

				// Fail closed: a misconfigured (non-binary) secretHash column can
				// never match a real secret, so treat the session as invalid. This
				// keeps "existing session with bad hash" indistinguishable from
				// "session not found", which an error path would otherwise expose.
				if (!isSecretHash(sessionRow.secretHash)) {
					return null;
				}

				const dbSession = mapRowToSession<A["select"]>(sessionRow);
				const dbUser = mapRowToUser<UA["select"]>(userRow);

				return { session: dbSession, user: dbUser };
			})
			.catch((cause) => new AdapterError({ operation: "findSessionWithUserById", cause }));
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
