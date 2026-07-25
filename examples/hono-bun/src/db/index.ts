import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

const client = new Database(":memory:");

const db = drizzle({
	client,
	schema,
});

migrate(db, { migrationsFolder: "./migrations" });

export { db };
