import { Database } from "bun:sqlite";

// Single global in-memory SQLite connection for the whole app.
// Swap ":memory:" for a file path (e.g. "app.sqlite") to persist to disk.
export const db = new Database(":memory:");

// Keep things sane under concurrent access.
db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");

function migrate() {
	db.run(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at TEXT NOT NULL
		)
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
			secret_hash BLOB NOT NULL,
			created_at TEXT NOT NULL,
			last_verified_at TEXT NOT NULL,
			ip_address TEXT NOT NULL DEFAULT ''
		)
	`);

	db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)`);
}

migrate();
