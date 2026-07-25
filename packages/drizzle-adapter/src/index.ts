import type { Adapter, AdapterError, DatabaseSession } from "@nyx-auth/core";
import type { MySqlDatabase } from "drizzle-orm/mysql-core";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { createMySQLAdapter, type MySQLSessionTable } from "./drivers/mysql";
import { createPostgresAdapter, type PgSessionTable } from "./drivers/postgresql";
import { createSQLiteAdapter, type SQLiteSessionTable } from "./drivers/sqlite";

export type { MySQLSessionTable, PgSessionTable, SQLiteSessionTable };

type BaseColumnNames = "id" | "userId" | "secretHash" | "createdAt" | "lastVerifiedAt";

type InferTableAttributes<T> = T extends { _: { columns: infer Cols } }
	? { [K in keyof Cols as K extends BaseColumnNames ? never : K]: Cols[K] extends { _: { data: infer D } } ? D : never }
	: Record<string, never>;

type DrizzleAdapterConfig<A extends Record<string, any>> =
	| {
			dialect: "sqlite";
			db: BaseSQLiteDatabase<"async" | "sync", any, any, any>;
			tables: { sessions: SQLiteSessionTable<A> };
	  }
	| {
			dialect: "postgres";
			db: PgDatabase<any, any, any>;
			tables: { sessions: PgSessionTable<A> };
	  }
	| {
			dialect: "mysql";
			db: MySqlDatabase<any, any, any>;
			tables: { sessions: MySQLSessionTable<A> };
	  };

export class DrizzleAdapter<A extends Record<string, any> = Record<never, never>> implements Adapter<A> {
	private driver: Adapter<A>;

	constructor(config: DrizzleAdapterConfig<A>) {
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

	insertSession(session: DatabaseSession<A>): Promise<undefined | AdapterError> {
		return this.driver.insertSession(session);
	}

	findSessionById(sessionId: string): Promise<DatabaseSession<A> | null | AdapterError> {
		return this.driver.findSessionById(sessionId);
	}

	updateSessionbyId(sessionId: string, session: Partial<Omit<DatabaseSession<A>, "id" | "userId">>): Promise<undefined | AdapterError> {
		return this.driver.updateSessionbyId(sessionId, session);
	}

	deleteSessionById(sessionId: string): Promise<undefined | AdapterError> {
		return this.driver.deleteSessionById(sessionId);
	}

	deleteSessionsByUserId(userId: string): Promise<undefined | AdapterError> {
		return this.driver.deleteSessionsByUserId(userId);
	}
}
