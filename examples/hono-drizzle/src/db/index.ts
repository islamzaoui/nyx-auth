import { createClient } from "@libsql/client/sqlite3";
import { pushSQLiteSchema } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
	url: ":memory:",
});

const db = drizzle({
	client,
	schema,
});

const { apply } = await pushSQLiteSchema(schema, db);
await apply();

export { db };
