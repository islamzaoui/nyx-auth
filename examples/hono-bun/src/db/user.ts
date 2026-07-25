import { eq } from "drizzle-orm";
import { db } from ".";
import { users } from "./schema";

export type User = typeof users.$inferSelect;

export type PublicUser = Omit<User, "passwordHash">;

export async function createUser(email: string, passwordHash: string): Promise<User> {
	return db.insert(users).values({ email, passwordHash }).returning().get();
}

export function findUserByEmail(email: string): User | null {
	return db.select().from(users).where(eq(users.email, email)).get() ?? null;
}

export function findUserById(id: string): User | null {
	return db.select().from(users).where(eq(users.id, id)).get() ?? null;
}
