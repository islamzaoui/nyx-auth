import { type Adapter, AdapterError, type DatabaseSession } from "@nyx-auth/core";
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

export type PgSessionTable<A extends Record<string, any> = Record<never, never>> = PgTableWithColumns<{
	dialect: "pg";
	columns: BaseColumns & { [K in keyof A as K extends keyof BaseColumns ? never : K]: AttributeColumn<A[K]> };
	schema: any;
	name: any;
}>;

export function createPostgresAdapter<A extends Record<string, any>>(db: PgDatabase<any, any, any>, table: PgSessionTable): Adapter<A> {
	return new PostgresCoreAdapter<A>(db, table);
}

class PostgresCoreAdapter<A extends Record<string, any>> implements Adapter<A> {
	private db: PgDatabase<any, any, any>;
	private table: PgSessionTable;

	constructor(db: PgDatabase<any, any, any>, table: PgSessionTable) {
		this.db = db;
		this.table = table;
	}

	async insertSession(session: DatabaseSession<A>): Promise<undefined | AdapterError> {
		try {
			await this.db.insert(this.table).values({
				id: session.id,
				userId: session.userId,
				secretHash: session.secretHash,
				createdAt: session.createdAt,
				lastVerifiedAt: session.lastVerifiedAt,
				...session.attributes,
			});
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "insertSession", cause });
		}
	}

	async findSessionById(sessionId: string): Promise<DatabaseSession<A> | null | AdapterError> {
		try {
			const [row] = await this.db.select().from(this.table).where(eq(this.table.id, sessionId));
			if (!row) return null;
			return mapRowToSession<A>(row);
		} catch (cause) {
			return new AdapterError({ operation: "findSessionById", cause });
		}
	}

	async updateSessionbyId(sessionId: string, session: Partial<Omit<DatabaseSession<A>, "id" | "userId">>): Promise<undefined | AdapterError> {
		try {
			const [row] = await this.db.select().from(this.table).where(eq(this.table.id, sessionId));
			if (!row) return undefined;

			const existingSession = mapRowToSession<A>(row);
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
				.where(eq(this.table.id, sessionId));
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "updateSessionbyId", cause });
		}
	}

	async deleteSessionById(sessionId: string): Promise<undefined | AdapterError> {
		try {
			await this.db.delete(this.table).where(eq(this.table.id, sessionId));
			return undefined;
		} catch (cause) {
			return new AdapterError({ operation: "deleteSessionById", cause });
		}
	}

	async deleteSessionsByUserId(userId: string): Promise<undefined | AdapterError> {
		try {
			await this.db.delete(this.table).where(eq(this.table.userId, userId));
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
