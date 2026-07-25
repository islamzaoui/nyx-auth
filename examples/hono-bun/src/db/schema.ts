import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	secretHash: blob("secret_hash", { mode: "buffer" }).$type<Uint8Array>().notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	lastVerifiedAt: integer("last_verified_at", { mode: "timestamp" }).notNull(),
	ipAddress: text("ip_address").notNull().default(""),
	role: text("role").notNull().default("user"),
});
