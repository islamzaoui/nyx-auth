import { beforeEach, describe, expect, test } from "bun:test";
import { type DatabaseSession, Nyx, TimeSpan, UnexpectedError } from "../../src";
import { hashSecret } from "../../src/utils/crypto";
import { expectResult, MockAdapter, type TestNyx } from "../utils/mock-adapter";

const BASE_TIME = new Date("2026-01-01T00:00:00.000Z");
const INACTIVITY_TIMEOUT = new TimeSpan(10, "m");
const ACTIVITY_CHECK_INTERVAL = new TimeSpan(1, "m");
const SESSION_TOKEN_PATTERN = /^[a-kmnp-z2-9]{32}\.[a-kmnp-z2-9]{32}$/;

let nowMs = BASE_TIME.getTime();
const now = () => new Date(nowMs);
const advance = (ms: number) => {
	nowMs += ms;
};

beforeEach(() => {
	nowMs = BASE_TIME.getTime();
});

function createNyx(adapter: MockAdapter): TestNyx {
	return new Nyx({
		adapter,
		session: {
			now,
			inactivityTimeout: INACTIVITY_TIMEOUT,
			activityCheckInterval: ACTIVITY_CHECK_INTERVAL,
			mapSessionAttributes: (attributes) => ({ ipAddress: attributes.ipAddress }),
		},
		user: {
			mapUserAttributes: (attributes) => ({ email: attributes.email }),
		},
	});
}

async function seedUser(adapter: MockAdapter, id = "user-1") {
	await adapter.insertUser({ id, attributes: { email: "a@b.c" } });
}

function makeSession(id: string, userId: string, lastVerifiedAtMs: number): DatabaseSession<Record<string, unknown>> {
	return {
		id,
		userId,
		secretHash: new Uint8Array(32),
		createdAt: new Date(lastVerifiedAtMs),
		lastVerifiedAt: new Date(lastVerifiedAtMs),
		attributes: { ipAddress: "1.2.3.4" },
	};
}

describe("nyx.session.create", () => {
	test("returns a well-formed token and stores the secret hash", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const { token, value } = expectResult(await nyx.session.create("user-1", { ipAddress: "1.2.3.4" }));
		expect(token).toMatch(SESSION_TOKEN_PATTERN);

		const [id, secret] = token.split(".") as [string, string];
		const stored = adapter.sessions.get(id);
		expect(stored).toBeDefined();
		expect(stored?.userId).toBe("user-1");
		expect(stored?.secretHash).toEqual(await hashSecret(secret));

		expect(value).toEqual({
			ipAddress: "1.2.3.4",
			id,
			userId: "user-1",
			createdAt: BASE_TIME,
			lastVerifiedAt: BASE_TIME,
		});
		expect("secretHash" in value).toBe(false);
	});

	test("returns UnexpectedError when the adapter fails", async () => {
		const adapter = new MockAdapter();
		adapter.fail("insertSession");
		const nyx = createNyx(adapter);

		const result = await nyx.session.create("user-1", {});
		expect(result).toBeInstanceOf(UnexpectedError);
	});
});

describe("nyx.session.validateToken", () => {
	test("returns the session and its user for a valid token", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const { token, value } = expectResult(await nyx.session.create("user-1", { ipAddress: "1.2.3.4" }));
		const { session, user } = expectResult(await nyx.session.validateToken(token));
		expect(session.id).toBe(value.id);
		expect(session.userId).toBe("user-1");
		expect(session.ipAddress).toBe("1.2.3.4");
		expect("secretHash" in session).toBe(false);
		expect(user).toEqual({ email: "a@b.c", id: "user-1" });
	});

	test("returns null for a malformed token without hitting the adapter", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		expect(await nyx.session.validateToken("not-a-token")).toBeNull();
		expect(await nyx.session.validateToken("tooshort.x")).toBeNull();
		expect(await nyx.session.validateToken("")).toBeNull();
		expect(adapter.calls).not.toContain("findSessionWithUserById");
	});

	test("returns null for an unknown session id", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const unknownToken = `${"a".repeat(32)}.${"a".repeat(32)}`;
		expect(await nyx.session.validateToken(unknownToken)).toBeNull();
		expect(adapter.calls).toContain("findSessionWithUserById");
	});

	test("returns null for a wrong secret", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const { token } = expectResult(await nyx.session.create("user-1", {}));
		const [id] = token.split(".") as [string];
		const wrongToken = `${id}.${"b".repeat(32)}`;
		expect(await nyx.session.validateToken(wrongToken)).toBeNull();
		expect(adapter.sessions.has(id)).toBe(true);
	});

	test("deletes an expired session", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const { token, value } = expectResult(await nyx.session.create("user-1", {}));
		advance(INACTIVITY_TIMEOUT.milliseconds());

		expect(await nyx.session.validateToken(token)).toBeNull();
		expect(adapter.sessions.has(value.id)).toBe(false);
	});

	test("refreshes lastVerifiedAt once the activity check interval has elapsed", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const { token, value } = expectResult(await nyx.session.create("user-1", {}));
		advance(ACTIVITY_CHECK_INTERVAL.milliseconds());

		const result = await nyx.session.validateToken(token);
		expect(result).not.toBeNull();
		const refreshed = adapter.sessions.get(value.id);
		expect(refreshed?.lastVerifiedAt.getTime()).toBe(nowMs);
		expect(adapter.calls).toContain("updateSessionbyId");
	});

	test("does not refresh lastVerifiedAt before the activity check interval", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const { token, value } = expectResult(await nyx.session.create("user-1", {}));
		advance(ACTIVITY_CHECK_INTERVAL.milliseconds() - 1);

		const result = await nyx.session.validateToken(token);
		expect(result).not.toBeNull();
		const notRefreshed = adapter.sessions.get(value.id);
		expect(notRefreshed?.lastVerifiedAt.getTime()).toBe(BASE_TIME.getTime());
		expect(adapter.calls).not.toContain("updateSessionbyId");
	});

	test("mapped attributes cannot override base fields", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = new Nyx({
			adapter,
			session: {
				now,
				inactivityTimeout: INACTIVITY_TIMEOUT,
				activityCheckInterval: ACTIVITY_CHECK_INTERVAL,
				mapSessionAttributes: (attributes) => ({
					...attributes,
					id: "spoofed",
					userId: "spoofed",
					createdAt: new Date(0),
					lastVerifiedAt: new Date(0),
				}),
			},
			user: { mapUserAttributes: (attributes) => attributes },
		});

		const { token, value } = expectResult(await nyx.session.create("user-1", { ipAddress: "1.2.3.4" }));
		const { session } = expectResult(await nyx.session.validateToken(token));
		expect(session.id).toBe(value.id);
		expect(session.userId).toBe("user-1");
		expect(session.createdAt.getTime()).toBe(BASE_TIME.getTime());
		expect(session.lastVerifiedAt.getTime()).toBe(BASE_TIME.getTime());
	});

	test("returns UnexpectedError when the adapter fails", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		adapter.fail("findSessionWithUserById");
		const nyx = createNyx(adapter);

		const result = await nyx.session.validateToken(`${"a".repeat(32)}.${"a".repeat(32)}`);
		expect(result).toBeInstanceOf(UnexpectedError);
	});
});

describe("nyx.session.invalidate", () => {
	test("deletes the session and reports whether it existed", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const { value } = expectResult(await nyx.session.create("user-1", {}));
		expect(await nyx.session.invalidate(value.id)).toBe(true);
		expect(adapter.sessions.has(value.id)).toBe(false);
		expect(await nyx.session.invalidate(value.id)).toBe(false);
	});
});

describe("nyx.session.invalidateAll", () => {
	test("deletes all of a user's sessions", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const { value: first } = expectResult(await nyx.session.create("user-1", {}));
		await nyx.session.create("user-1", {});
		expect(await nyx.session.invalidateAll("user-1")).toBe(true);
		expect(adapter.sessions.has(first.id)).toBe(false);
		expect(adapter.sessions.size).toBe(0);
		expect(await nyx.session.invalidateAll("user-1")).toBe(false);
	});
});

describe("nyx.session.updateAttributes", () => {
	test("updates attributes and strips reserved keys", async () => {
		const adapter = new MockAdapter();
		await seedUser(adapter);
		const nyx = createNyx(adapter);

		const { value } = expectResult(await nyx.session.create("user-1", { ipAddress: "1.2.3.4" }));
		const result = await nyx.session.updateAttributes(value.id, {
			ipAddress: "5.5.5.5",
			userId: "attacker",
			secretHash: "x",
			id: "attacker",
		});
		expect(result).toBeUndefined();

		const stored = adapter.sessions.get(value.id);
		expect(stored).toBeDefined();
		expect(stored?.attributes).toEqual({ ipAddress: "5.5.5.5" });
		expect(stored?.userId).toBe("user-1");
		expect(stored?.id).toBe(value.id);
	});

	test("returns UnexpectedError when the adapter fails", async () => {
		const adapter = new MockAdapter();
		adapter.fail("updateSessionbyId");
		const nyx = createNyx(adapter);

		const result = await nyx.session.updateAttributes("session-1", { ipAddress: "1.1.1.1" });
		expect(result).toBeInstanceOf(UnexpectedError);
	});
});

describe("nyx.session.invalidateExpiredSessions", () => {
	test("deletes only sessions older than the inactivity timeout", async () => {
		const adapter = new MockAdapter({
			sessions: [
				makeSession("expired-old", "user-1", BASE_TIME.getTime() - 20 * 60_000),
				makeSession("expired-boundary", "user-1", BASE_TIME.getTime() - INACTIVITY_TIMEOUT.milliseconds()),
				makeSession("active", "user-1", BASE_TIME.getTime() - 5 * 60_000),
			],
			users: [{ id: "user-1", attributes: {} }],
		});
		const nyx = createNyx(adapter);

		const count = await nyx.session.invalidateExpiredSessions();
		expect(count).toBe(2);
		expect(adapter.sessions.has("expired-old")).toBe(false);
		expect(adapter.sessions.has("expired-boundary")).toBe(false);
		expect(adapter.sessions.has("active")).toBe(true);
	});

	test("returns UnexpectedError when the adapter fails", async () => {
		const adapter = new MockAdapter();
		adapter.fail("deleteExpiredSessions");
		const nyx = createNyx(adapter);

		const result = await nyx.session.invalidateExpiredSessions();
		expect(result).toBeInstanceOf(UnexpectedError);
	});
});
