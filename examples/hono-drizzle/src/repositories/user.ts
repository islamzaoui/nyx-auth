import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DatabaseError } from "@/lib/error";

export type DBUser = typeof users.$inferSelect;

export async function findUserByEmail(email: string): Promise<DBUser | null | DatabaseError> {
	return db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.get()
		.then((user) => user ?? null)
		.catch((cause) => {
			return new DatabaseError({
				operation: "findUserByEmail",
				cause: cause,
			});
		});
}
