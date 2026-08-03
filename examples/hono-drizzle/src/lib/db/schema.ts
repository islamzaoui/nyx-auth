import { relations } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", (t) => ({
	// Required user attributes
	id: t
		.text()
		.primaryKey()
		.$default(() => crypto.randomUUID()),
	// Additional user attributes
	name: t.text().notNull(),
	email: t.text().notNull().unique(),
	passwordHash: t.text().notNull(),
	createdAt: t
		.integer({ mode: "timestamp" })
		.notNull()
		.$default(() => new Date()),
	updatedAt: t
		.integer({ mode: "timestamp" })
		.notNull()
		.$default(() => new Date())
		.$onUpdate(() => new Date()),
}));

export const userRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	todos: many(todos),
}));

export const sessions = sqliteTable(
	"sessions",
	(t) => ({
		// Required session attributes
		id: t.text().primaryKey(),
		userId: t
			.text()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		secretHash: t.blob({ mode: "buffer" }).notNull(),
		createdAt: t.integer({ mode: "timestamp" }).notNull(),
		lastVerifiedAt: t.integer({ mode: "timestamp" }).notNull(),
		// Additional session attributes
		ipAddress: t.text(),
		userAgent: t.text(),
	}),
	(t) => [index("sessions_user_id_idx").on(t.userId), index("sessions_last_verified_at_idx").on(t.lastVerifiedAt)]
);

export const sessionRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const todos = sqliteTable(
	"todos",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$default(() => crypto.randomUUID()),
		userId: t
			.text()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: t.text().notNull(),
		description: t.text(),
		completed: t.integer({ mode: "boolean" }).notNull().default(false),
		priority: t.integer().notNull().default(0),
		dueDate: t.integer({ mode: "timestamp" }),
		createdAt: t
			.integer({ mode: "timestamp" })
			.notNull()
			.$default(() => new Date()),
		updatedAt: t
			.integer({ mode: "timestamp" })
			.notNull()
			.$default(() => new Date())
			.$onUpdate(() => new Date()),
	}),
	(t) => [index("todos_user_id_idx").on(t.userId), index("todos_completed_idx").on(t.completed), index("todos_due_date_idx").on(t.dueDate)]
);

export const todoRelations = relations(todos, ({ one }) => ({
	user: one(users, {
		fields: [todos.userId],
		references: [users.id],
	}),
}));
