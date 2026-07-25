import { eq } from "drizzle-orm";
import { db } from ".";
import { users } from "./schema";

export interface User {
	id: string;
	email: string;
	passwordHash: string;
	createdAt: string;
}

export function createUser(email: string, passwordHash: string): User {
	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();

	db.insert(users).values({ id, email, passwordHash, createdAt }).run();

	return { id, email, passwordHash, createdAt };
}

export function findUserByEmail(email: string): User | null {
	const row = db.select().from(users).where(eq(users.email, email)).get();
	return row ?? null;
}

export function findUserById(id: string): User | null {
	const row = db.select().from(users).where(eq(users.id, id)).get();
	return row ?? null;
}
