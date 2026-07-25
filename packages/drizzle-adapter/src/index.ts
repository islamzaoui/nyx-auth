import type { Adapter, AdapterError, Attributes, DatabaseSession } from "@nyx-auth/core";
import type { MySqlDatabase } from "drizzle-orm/mysql-core";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { createMySQLAdapter, type MySQLSessionTable } from "./drivers/mysql";
import { createPostgresAdapter, type PgSessionTable } from "./drivers/postgresql";
import { createSQLiteAdapter, type SQLiteSessionTable } from "./drivers/sqlite";

export type { MySQLSessionTable, PgSessionTable, SQLiteSessionTable };

type BaseColumnNames = "id" | "userId" | "secretHash" | "createdAt" | "lastVerifiedAt";

type InferTableSelect<T> = T extends { _: { columns: infer Cols } }
	? { [K in keyof Cols as K extends BaseColumnNames ? never : K]: Cols[K] extends { _: { data: infer D } } ? D : never }
	: Record<string, never>;

// biome-ignore lint/complexity/noBannedTypes: standard pattern to detect optional properties
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

type InferTableInsert<T> = T extends { _: { columns: infer Cols }; $inferInsert: infer Insert }
	? {
			[K in keyof Cols as K extends BaseColumnNames
				? never
				: K extends keyof Insert
					? IsOptional<Insert, K> extends true
						? never
						: K
					: never]: K extends keyof Insert ? Insert[K] : never;
		} & {
			[K in keyof Cols as K extends BaseColumnNames
				? never
				: K extends keyof Insert
					? IsOptional<Insert, K> extends true
						? K
						: never
					: never]?: K extends keyof Insert ? Insert[K] : never;
		}
	: Record<string, never>;

type InferTableAttributes<T> = Attributes<InferTableSelect<T>, InferTableInsert<T>>;

type DrizzleAdapterConfig =
	| {
			dialect: "sqlite";
			db: BaseSQLiteDatabase<"async" | "sync", any, any, any>;
			tables: { sessions: SQLiteSessionTable };
	  }
	| {
			dialect: "postgres";
			db: PgDatabase<any, any, any>;
			tables: { sessions: PgSessionTable };
	  }
	| {
			dialect: "mysql";
			db: MySqlDatabase<any, any, any>;
			tables: { sessions: MySQLSessionTable };
	  };

export class DrizzleAdapter<A extends Attributes = Attributes> implements Adapter<A> {
	private driver: Adapter<A>;

	constructor(config: DrizzleAdapterConfig) {
		if (config.dialect === "sqlite") {
			this.driver = createSQLiteAdapter<A>(config.db, config.tables.sessions as unknown as SQLiteSessionTable);
		} else if (config.dialect === "postgres") {
			this.driver = createPostgresAdapter<A>(config.db, config.tables.sessions as unknown as PgSessionTable);
		} else {
			this.driver = createMySQLAdapter<A>(config.db, config.tables.sessions as unknown as MySQLSessionTable);
		}
	}

	static sqlite<T extends SQLiteSessionTable>(config: {
		db: BaseSQLiteDatabase<"async" | "sync", any, any, any>;
		tables: { sessions: T };
	}): DrizzleAdapter<InferTableAttributes<T>> {
		return new DrizzleAdapter(config as never) as DrizzleAdapter<InferTableAttributes<T>>;
	}

	static postgres<T extends PgSessionTable>(config: {
		db: PgDatabase<any, any, any>;
		tables: { sessions: T };
	}): DrizzleAdapter<InferTableAttributes<T>> {
		return new DrizzleAdapter(config as never) as DrizzleAdapter<InferTableAttributes<T>>;
	}

	static mysql<T extends MySQLSessionTable>(config: {
		db: MySqlDatabase<any, any, any>;
		tables: { sessions: T };
	}): DrizzleAdapter<InferTableAttributes<T>> {
		return new DrizzleAdapter(config as never) as DrizzleAdapter<InferTableAttributes<T>>;
	}

	insertSession(session: DatabaseSession<A["insert"]>): Promise<DatabaseSession<A["select"]> | AdapterError> {
		return this.driver.insertSession(session);
	}

	findSessionById(sessionId: string): Promise<DatabaseSession<A["select"]> | null | AdapterError> {
		return this.driver.findSessionById(sessionId);
	}

	updateSessionbyId(
		sessionId: string,
		session: Partial<Omit<DatabaseSession<Partial<A["select"]>>, "id" | "userId">>
	): Promise<undefined | AdapterError> {
		return this.driver.updateSessionbyId(sessionId, session);
	}

	deleteSessionById(sessionId: string): Promise<undefined | AdapterError> {
		return this.driver.deleteSessionById(sessionId);
	}

	deleteSessionsByUserId(userId: string): Promise<undefined | AdapterError> {
		return this.driver.deleteSessionsByUserId(userId);
	}
}
