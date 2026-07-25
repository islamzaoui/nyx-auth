import { type Adapter, AdapterError, type Attributes, type DatabaseSession } from "@nyx-auth/core";
import { eq } from "drizzle-orm";
import type { BaseSQLiteDatabase, SQLiteColumn, SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";

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

export type SQLiteSessionTable<A extends Record<string, any> = Record<never, never>> = SQLiteTableWithColumns<{
	dialect: "sqlite";
	columns: BaseColumns & { [K in keyof A as K extends keyof BaseColumns ? never : K]: AttributeColumn<A[K]> };
	schema: any;
	name: any;
}>;

export function createSQLiteAdapter<A extends Attributes>(db: BaseSQLiteDatabase<"async" | "sync", any>, table: SQLiteSessionTable): Adapter<A> {
	return new SQLiteCoreAdapter<A>(db, table);
}

class SQLiteCoreAdapter<A extends Attributes> implements Adapter<A> {
	private db: BaseSQLiteDatabase<"async" | "sync", any>;
	private table: SQLiteSessionTable;

	constructor(db: BaseSQLiteDatabase<"async" | "sync", any>, table: SQLiteSessionTable) {
		this.db = db;
		this.table = table;
	}

	async insertSession(session: DatabaseSession<A["insert"]>): Promise<DatabaseSession<A["select"]> | AdapterError> {
		try {
			const [row] = await this.db
				.insert(this.table)
				.values({
					id: session.id,
					userId: session.userId,
					secretHash: session.secretHash,
					createdAt: session.createdAt,
					lastVerifiedAt: session.lastVerifiedAt,
					...session.attributes,
				})
				.returning()
				.all();
			if (!row) return new AdapterError({ operation: "insertSession", cause: new Error("Failed to retrieve inserted session") });
			return mapRowToSession<A["select"]>(row);
		} catch (cause) {
			return new AdapterError({ operation: "insertSession", cause });
		}
	}

	async findSessionById(sessionId: string): Promise<DatabaseSession<A["select"]> | null | AdapterError> {
		try {
			const row = await this.db.select().from(this.table).where(eq(this.table.id, sessionId)).get();
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
			const row = await this.db.select().from(this.table).where(eq(this.table.id, sessionId)).get();
			if (!row) return undefined;

			const existingSession = mapRowToSession<A["select"]>(row);
			const secretHash = session.secretHash ?? existingSession.secretHash;
			const createdAt = session.createdAt ?? existingSession.createdAt;
			const lastVerifiedAt = session.lastVerifiedAt ?? existingSession.lastVerifiedAt;
			const attributes = { ...existingSession.attributes, ...session.attributes };

			await this.db
				.update(this.table)
				.set({
					secretHash,
					createdAt,
					lastVerifiedAt,
					...attributes,
				})
				.where(eq(this.table.id, sessionId))
				.run();
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "updateSessionbyId", cause });
		}
	}

	async deleteSessionById(sessionId: string): Promise<undefined | AdapterError> {
		try {
			await this.db.delete(this.table).where(eq(this.table.id, sessionId)).run();
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "deleteSessionById", cause });
		}
	}

	async deleteSessionsByUserId(userId: string): Promise<undefined | AdapterError> {
		try {
			await this.db.delete(this.table).where(eq(this.table.userId, userId)).run();
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "deleteSessionsByUserId", cause });
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
