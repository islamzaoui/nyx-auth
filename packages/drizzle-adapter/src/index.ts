import type { Adapter, AdapterError, Attributes, DatabaseSession, DatabaseUser } from "@nyx-auth/core";
import type { MySqlDatabase } from "drizzle-orm/mysql-core";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { createMySQLAdapter, type MySQLSessionTable, type MySQLUserTable } from "./drivers/mysql";
import { createPostgresAdapter, type PgSessionTable, type PgUserTable } from "./drivers/postgresql";
import { createSQLiteAdapter, type SQLiteSessionTable, type SQLiteUserTable } from "./drivers/sqlite";

export type { MySQLSessionTable, MySQLUserTable, PgSessionTable, PgUserTable, SQLiteSessionTable, SQLiteUserTable };

type BaseColumnNames = "id" | "userId" | "secretHash" | "createdAt" | "lastVerifiedAt";

type UserBaseColumnNames = "id";

type InferTableSelect<T, Base extends string> = T extends { _: { columns: infer Cols } }
	? { [K in keyof Cols as K extends Base ? never : K]: Cols[K] extends { _: { data: infer D } } ? D : never }
	: Record<string, never>;

// biome-ignore lint/complexity/noBannedTypes: standard pattern to detect optional properties
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

type InferTableInsert<T, Base extends string> = T extends { _: { columns: infer Cols }; $inferInsert: infer Insert }
	? {
			[K in keyof Cols as K extends Base
				? never
				: K extends keyof Insert
					? IsOptional<Insert, K> extends true
						? never
						: K
					: never]: K extends keyof Insert ? Insert[K] : never;
		} & {
			[K in keyof Cols as K extends Base
				? never
				: K extends keyof Insert
					? IsOptional<Insert, K> extends true
						? K
						: never
					: never]?: K extends keyof Insert ? Insert[K] : never;
		}
	: Record<string, never>;

type InferTableAttributes<T> = Attributes<InferTableSelect<T, BaseColumnNames>, InferTableInsert<T, BaseColumnNames>>;
type InferUserTableAttributes<T> = Attributes<InferTableSelect<T, UserBaseColumnNames>, InferTableInsert<T, UserBaseColumnNames>>;

type DrizzleAdapterConfig =
	| {
			dialect: "sqlite";
			db: BaseSQLiteDatabase<"async" | "sync", any, any, any>;
			tables: { sessions: SQLiteSessionTable; users: SQLiteUserTable };
	  }
	| {
			dialect: "postgres";
			db: PgDatabase<any, any, any>;
			tables: { sessions: PgSessionTable; users: PgUserTable };
	  }
	| {
			dialect: "mysql";
			db: MySqlDatabase<any, any, any>;
			tables: { sessions: MySQLSessionTable; users: MySQLUserTable };
	  };

export class DrizzleAdapter<A extends Attributes = Attributes, UA extends Attributes = Attributes> implements Adapter<A, UA> {
	private driver: Adapter<A, UA>;

	constructor(config: DrizzleAdapterConfig) {
		if (config.dialect === "sqlite") {
			this.driver = createSQLiteAdapter<A, UA>(
				config.db,
				config.tables.sessions as unknown as SQLiteSessionTable,
				config.tables.users as unknown as SQLiteUserTable
			);
		} else if (config.dialect === "postgres") {
			this.driver = createPostgresAdapter<A, UA>(
				config.db,
				config.tables.sessions as unknown as PgSessionTable,
				config.tables.users as unknown as PgUserTable
			);
		} else {
			this.driver = createMySQLAdapter<A, UA>(
				config.db,
				config.tables.sessions as unknown as MySQLSessionTable,
				config.tables.users as unknown as MySQLUserTable
			);
		}
	}

	static sqlite<T extends SQLiteSessionTable, U extends SQLiteUserTable>(config: {
		db: BaseSQLiteDatabase<"async" | "sync", any, any, any>;
		tables: { sessions: T; users: U };
	}): DrizzleAdapter<InferTableAttributes<T>, InferUserTableAttributes<U>> {
		return new DrizzleAdapter({ dialect: "sqlite", ...config } as DrizzleAdapterConfig) as DrizzleAdapter<
			InferTableAttributes<T>,
			InferUserTableAttributes<U>
		>;
	}

	static postgres<T extends PgSessionTable, U extends PgUserTable>(config: {
		db: PgDatabase<any, any, any>;
		tables: { sessions: T; users: U };
	}): DrizzleAdapter<InferTableAttributes<T>, InferUserTableAttributes<U>> {
		return new DrizzleAdapter({ dialect: "postgres", ...config } as DrizzleAdapterConfig) as DrizzleAdapter<
			InferTableAttributes<T>,
			InferUserTableAttributes<U>
		>;
	}

	static mysql<T extends MySQLSessionTable, U extends MySQLUserTable>(config: {
		db: MySqlDatabase<any, any, any>;
		tables: { sessions: T; users: U };
	}): DrizzleAdapter<InferTableAttributes<T>, InferUserTableAttributes<U>> {
		return new DrizzleAdapter({ dialect: "mysql", ...config } as DrizzleAdapterConfig) as DrizzleAdapter<
			InferTableAttributes<T>,
			InferUserTableAttributes<U>
		>;
	}

	insertSession(session: DatabaseSession<A["insert"]>): Promise<DatabaseSession<A["select"]> | AdapterError> {
		return this.driver.insertSession(session);
	}

	updateSessionbyId(
		sessionId: string,
		session: Partial<Omit<DatabaseSession<Partial<A["select"]>>, "id" | "userId">>
	): Promise<undefined | AdapterError> {
		return this.driver.updateSessionbyId(sessionId, session);
	}

	deleteSessionById(sessionId: string): Promise<boolean | AdapterError> {
		return this.driver.deleteSessionById(sessionId);
	}

	deleteSessionsByUserId(userId: string): Promise<boolean | AdapterError> {
		return this.driver.deleteSessionsByUserId(userId);
	}

	insertUser(user: DatabaseUser<UA["insert"]>): Promise<DatabaseUser<UA["select"]> | AdapterError> {
		return this.driver.insertUser(user);
	}

	findUserById(userId: string): Promise<DatabaseUser<UA["select"]> | null | AdapterError> {
		return this.driver.findUserById(userId);
	}

	updateUserbyId(userId: string, user: Partial<Omit<DatabaseUser<Partial<UA["select"]>>, "id">>): Promise<undefined | AdapterError> {
		return this.driver.updateUserbyId(userId, user);
	}

	deleteUserById(userId: string): Promise<undefined | AdapterError> {
		return this.driver.deleteUserById(userId);
	}

	findSessionWithUserById(
		sessionId: string
	): Promise<{ session: DatabaseSession<A["select"]>; user: DatabaseUser<UA["select"]> } | null | AdapterError> {
		return this.driver.findSessionWithUserById(sessionId);
	}
}
