import { createClient } from "@libsql/client/sqlite3";
import { drizzle } from "drizzle-orm/libsql/sqlite3";

const client = createClient({
	url: ":memory:",
});

const db = drizzle({ client });

// drizzle-kit v1 dropped the programmatic SQLite schema push API, so the
// in-memory schema is created directly from the DDL below.
// SQLite disables foreign-key enforcement per connection by default.
await db.$client.execute("PRAGMA foreign_keys = ON");
// WARNING: this DDL deliberately mirrors `schema.ts` — keep it in sync, or
// inserts against a non-`:memory:` database fail with "no such column".
await db.$client.executeMultiple(`
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		email TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		created_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		secret_hash BLOB NOT NULL,
		created_at INTEGER NOT NULL,
		last_verified_at INTEGER NOT NULL,
		ip_address TEXT NOT NULL,
		name TEXT NOT NULL DEFAULT 'Unknown'
	);

	CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
	CREATE INDEX IF NOT EXISTS sessions_last_verified_at_idx ON sessions (last_verified_at);
`);

export { db };
