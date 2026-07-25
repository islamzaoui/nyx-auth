import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

export type User = typeof users.$inferSelect;

export type PublicUser = Omit<User, "passwordHash">;

export async function createUser(email: string, passwordHash: string): Promise<User> {
	const [user] = await db.insert(users).values({ email, passwordHash }).returning().execute();
	// biome-ignore lint/style/noNonNullAssertion: user will always be defined here because we just inserted it
	return user!;
}

export async function findUserByEmail(email: string): Promise<User | null> {
	return db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.get()
		.then((user) => user ?? null);
}

export async function findUserById(id: string): Promise<User | null> {
	return db
		.select()
		.from(users)
		.where(eq(users.id, id))
		.get()
		.then((user) => user ?? null);
}
