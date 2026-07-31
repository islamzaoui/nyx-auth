import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

export async function findUserByEmail(email: string): Promise<typeof users.$inferSelect | null> {
	return db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.get()
		.then((user) => user ?? null);
}
