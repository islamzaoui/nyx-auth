import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";
import type { User } from "./nyx";

export async function findUserByEmail(email: string): Promise<User | null> {
	return db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.get()
		.then((user) => user ?? null);
}
