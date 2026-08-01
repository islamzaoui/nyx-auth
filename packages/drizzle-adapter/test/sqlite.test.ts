import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { AdapterError, Nyx } from "@nyx-auth/core";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { DrizzleAdapter } from "../src";
import { affectedRows } from "../src/drivers/mysql";
import { isSecretHash } from "../src/drivers/sanitize";

function expectResult<T>(result: T): Exclude<NonNullable<T>, Error> {
	expect(result).not.toBeInstanceOf(Error);
	expect(result).not.toBeNull();
	return result as Exclude<NonNullable<T>, Error>;
}

function createAdapter() {
	const sqlite = new Database(":memory:");
	sqlite.run(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL)`);
	sqlite.run(`CREATE TABLE sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		secret_hash BLOB NOT NULL,
		created_at INTEGER NOT NULL,
		last_verified_at INTEGER NOT NULL,
		ip_address TEXT
	)`);

	const users = sqliteTable("users", {
		id: text("id").primaryKey(),
		email: text("email").notNull(),
	});

	const sessions = sqliteTable("sessions", {
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		secretHash: blob("secret_hash", { mode: "buffer" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		lastVerifiedAt: integer("last_verified_at", { mode: "timestamp" }).notNull(),
		ipAddress: text("ip_address"),
	});

	const adapter = DrizzleAdapter.sqlite({ db: drizzle(sqlite), tables: { sessions, users } });
	return { adapter };
}

async function insertSession(adapter: DrizzleAdapter, id: string, userId: string, lastVerifiedAt: Date) {
	const result = await adapter.insertSession({
		id,
		userId,
		secretHash: new Uint8Array(32).fill(1),
		createdAt: lastVerifiedAt,
		lastVerifiedAt,
		attributes: { ipAddress: "1.2.3.4" },
	});
	expect(result).not.toBeInstanceOf(AdapterError);
	return result;
}

describe("DrizzleAdapter sqlite", () => {
	test("inserts a session and finds it joined with its user", async () => {
		const { adapter } = createAdapter();
		const user = await adapter.insertUser({ id: "user-1", attributes: { email: "a@b.c" } });
		expect(user).not.toBeInstanceOf(AdapterError);

		const inserted = await insertSession(adapter, "session-1", "user-1", new Date("2026-01-01T00:00:00.000Z"));
		expect(inserted).not.toBeInstanceOf(AdapterError);

		const found = await adapter.findSessionWithUserById("session-1");
		const { session, user: foundUser } = expectResult(found);
		expect(session.id).toBe("session-1");
		expect(session.userId).toBe("user-1");
		expect(session.secretHash).toBeInstanceOf(Uint8Array);
		expect(session.attributes.ipAddress).toBe("1.2.3.4");
		expect(foundUser.attributes.email).toBe("a@b.c");
	});

	test("returns null when the joined user is missing", async () => {
		const { adapter } = createAdapter();
		await insertSession(adapter, "orphan", "missing-user", new Date("2026-01-01T00:00:00.000Z"));
		expect(await adapter.findSessionWithUserById("orphan")).toBeNull();
	});

	test("performs user CRUD", async () => {
		const { adapter } = createAdapter();
		await adapter.insertUser({ id: "user-1", attributes: { email: "a@b.c" } });

		const found = expectResult(await adapter.findUserById("user-1"));
		expect(found.attributes.email).toBe("a@b.c");

		await adapter.updateUserbyId("user-1", { attributes: { email: "b@c.d" } });
		expect(expectResult(await adapter.findUserById("user-1")).attributes.email).toBe("b@c.d");

		await adapter.deleteUserById("user-1");
		expect(await adapter.findUserById("user-1")).toBeNull();
	});

	test("deletes sessions by id and by user", async () => {
		const { adapter } = createAdapter();
		await adapter.insertUser({ id: "user-1", attributes: { email: "a@b.c" } });
		await insertSession(adapter, "s1", "user-1", new Date("2026-01-01T00:00:00.000Z"));
		await insertSession(adapter, "s2", "user-1", new Date("2026-01-01T00:00:00.000Z"));

		expect(await adapter.deleteSessionById("s1")).toBe(true);
		expect(await adapter.deleteSessionById("s1")).toBe(false);
		expect(await adapter.deleteSessionsByUserId("user-1")).toBe(true);
		expect(await adapter.deleteSessionsByUserId("user-1")).toBe(false);
	});

	test("deleteExpiredSessions removes only sessions at or before the cutoff", async () => {
		const { adapter } = createAdapter();
		await adapter.insertUser({ id: "user-1", attributes: { email: "a@b.c" } });
		const cutoff = new Date("2026-01-01T00:10:00.000Z");
		await insertSession(adapter, "expired", "user-1", new Date("2026-01-01T00:00:00.000Z"));
		await insertSession(adapter, "boundary", "user-1", cutoff);
		await insertSession(adapter, "active", "user-1", new Date("2026-01-01T00:20:00.000Z"));

		expect(await adapter.deleteExpiredSessions(cutoff)).toBe(2);
		expect(await adapter.findSessionWithUserById("expired")).toBeNull();
		expect(await adapter.findSessionWithUserById("boundary")).toBeNull();
		expect(await adapter.findSessionWithUserById("active")).not.toBeNull();
	});

	test("round trips a session through Nyx", async () => {
		const { adapter } = createAdapter();
		const nyx = new Nyx({
			adapter,
			session: { mapSessionAttributes: (attributes) => ({ ipAddress: attributes.ipAddress }) },
			user: { mapUserAttributes: (attributes) => ({ email: attributes.email }) },
		});

		const createdUser = expectResult(await nyx.user.create({ email: "a@b.c" }));
		const { token, value } = expectResult(await nyx.session.create(createdUser.id, { ipAddress: "1.2.3.4" }));

		const { session, user } = expectResult(await nyx.session.validateToken(token));
		expect(session.id).toBe(value.id);
		expect(session.ipAddress).toBe("1.2.3.4");
		expect(user.email).toBe("a@b.c");
		expect("secretHash" in session).toBe(false);
	});

	test("treats a text-typed secretHash column as an invalid session", async () => {
		const sqlite = new Database(":memory:");
		sqlite.run(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL)`);
		sqlite.run(`CREATE TABLE sessions_bad (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			secret_hash TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			last_verified_at INTEGER NOT NULL
		)`);
		sqlite.run(`INSERT INTO users VALUES ('user-1', 'a@b.c')`);
		sqlite.run(`INSERT INTO sessions_bad VALUES ('session-1', 'user-1', 'c2VjcmV0', 0, 0)`);

		const users = sqliteTable("users", {
			id: text("id").primaryKey(),
			email: text("email").notNull(),
		});
		const badSessions = sqliteTable("sessions_bad", {
			id: text("id").primaryKey(),
			userId: text("user_id").notNull(),
			secretHash: text("secret_hash").notNull(),
			createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
			lastVerifiedAt: integer("last_verified_at", { mode: "timestamp" }).notNull(),
		});

		const adapter = new DrizzleAdapter({
			dialect: "sqlite",
			db: drizzle(sqlite),
			tables: { sessions: badSessions as never, users: users as never },
		} as never);

		const result = await adapter.findSessionWithUserById("session-1");
		expect(result).toBeNull();
	});
});

describe("isSecretHash", () => {
	test("accepts Uint8Array and Buffer", () => {
		expect(isSecretHash(new Uint8Array(32))).toBe(true);
		expect(isSecretHash(Buffer.alloc(32))).toBe(true);
	});

	test("rejects non-binary values", () => {
		expect(isSecretHash("c2VjcmV0")).toBe(false);
		expect(isSecretHash(null)).toBe(false);
		expect(isSecretHash(undefined)).toBe(false);
	});
});

describe("affectedRows", () => {
	test("normalizes mysql2 tuple results", () => {
		expect(affectedRows([{ affectedRows: 3 }, []])).toBe(3);
	});

	test("normalizes object results", () => {
		expect(affectedRows({ affectedRows: 2 })).toBe(2);
		expect(affectedRows({ rowsAffected: 4 })).toBe(4);
	});

	test("returns 0 for empty results", () => {
		expect(affectedRows({})).toBe(0);
		expect(affectedRows([])).toBe(0);
	});
});
