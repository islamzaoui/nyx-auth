import { db } from ".";

export interface User {
	id: string;
	email: string;
	passwordHash: string;
	createdAt: string;
}

interface UserRow {
	id: string;
	email: string;
	password_hash: string;
	created_at: string;
}

function rowToUser(row: UserRow): User {
	return {
		id: row.id,
		email: row.email,
		passwordHash: row.password_hash,
		createdAt: row.created_at,
	};
}

export function createUser(email: string, passwordHash: string): User {
	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();

	db.query("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(id, email, passwordHash, createdAt);

	return { id, email, passwordHash, createdAt };
}

export function findUserByEmail(email: string): User | null {
	const row = db.query("SELECT * FROM users WHERE email = ?").get(email) as UserRow | null;
	return row ? rowToUser(row) : null;
}

export function findUserById(id: string): User | null {
	const row = db.query("SELECT * FROM users WHERE id = ?").get(id) as UserRow | null;
	return row ? rowToUser(row) : null;
}
