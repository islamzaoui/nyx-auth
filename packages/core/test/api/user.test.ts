import { describe, expect, test } from "bun:test";
import { Nyx, UnexpectedError } from "../../src";
import { MockAdapter, type TestNyx } from "../utils/mock-adapter";

function createNyx(adapter: MockAdapter, createId: () => string = () => "generated-id"): TestNyx {
	return new Nyx({
		adapter,
		session: {
			mapSessionAttributes: (attributes) => ({ ipAddress: attributes.ipAddress }),
		},
		user: {
			createId,
			mapUserAttributes: (attributes) => ({ email: attributes.email }),
		},
	});
}

async function seedSession(adapter: MockAdapter, id: string, userId: string) {
	await adapter.insertSession({
		id,
		userId,
		secretHash: new Uint8Array(32),
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		lastVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
		attributes: {},
	});
}

describe("nyx.user.create", () => {
	test("stores attributes and returns only the mapped shape", async () => {
		const adapter = new MockAdapter();
		const nyx = createNyx(adapter);

		const result = await nyx.user.create({ email: "a@b.c", passwordHash: "hash" });
		expect(result).not.toBeInstanceOf(Error);
		expect(result).toEqual({ id: "generated-id", email: "a@b.c" });

		const stored = adapter.users.get("generated-id");
		expect(stored).toBeDefined();
		expect(stored?.attributes).toEqual({ email: "a@b.c", passwordHash: "hash" });
	});

	test("uses the custom id generator", async () => {
		const adapter = new MockAdapter();
		const createId = () => "custom-id";
		const nyx = createNyx(adapter, createId);

		const result = await nyx.user.create({ email: "a@b.c" });
		expect(result).toEqual({ id: "custom-id", email: "a@b.c" });
	});

	test("ignores a spoofed id in the attributes", async () => {
		const adapter = new MockAdapter();
		const nyx = createNyx(adapter);

		const result = await nyx.user.create({ id: "spoofed", email: "a@b.c" });
		expect(result).toEqual({ id: "generated-id", email: "a@b.c" });
	});

	test("returns UnexpectedError when the adapter fails", async () => {
		const adapter = new MockAdapter();
		adapter.fail("insertUser");
		const nyx = createNyx(adapter);

		const result = await nyx.user.create({ email: "a@b.c" });
		expect(result).toBeInstanceOf(UnexpectedError);
	});
});

describe("nyx.user.get", () => {
	test("returns the mapped user without sensitive attributes", async () => {
		const adapter = new MockAdapter();
		await adapter.insertUser({ id: "user-1", attributes: { email: "a@b.c", passwordHash: "hash" } });
		const nyx = createNyx(adapter);

		const result = await nyx.user.get("user-1");
		expect(result).toEqual({ id: "user-1", email: "a@b.c" });
	});

	test("returns null for an unknown user", async () => {
		const adapter = new MockAdapter();
		const nyx = createNyx(adapter);

		expect(await nyx.user.get("missing")).toBeNull();
	});

	test("returns UnexpectedError when the adapter fails", async () => {
		const adapter = new MockAdapter();
		adapter.fail("findUserById");
		const nyx = createNyx(adapter);

		const result = await nyx.user.get("user-1");
		expect(result).toBeInstanceOf(UnexpectedError);
	});
});

describe("nyx.user.updateAttributes", () => {
	test("updates attributes and ignores the reserved id", async () => {
		const adapter = new MockAdapter();
		await adapter.insertUser({ id: "user-1", attributes: { email: "old@b.c" } });
		const nyx = createNyx(adapter);

		const result = await nyx.user.updateAttributes("user-1", { email: "new@b.c", id: "spoofed" });
		expect(result).toBeUndefined();

		const stored = adapter.users.get("user-1");
		expect(stored).toBeDefined();
		expect(stored?.attributes).toEqual({ email: "new@b.c" });
		expect(stored?.id).toBe("user-1");
	});

	test("returns UnexpectedError when the adapter fails", async () => {
		const adapter = new MockAdapter();
		adapter.fail("updateUserbyId");
		const nyx = createNyx(adapter);

		const result = await nyx.user.updateAttributes("user-1", { email: "new@b.c" });
		expect(result).toBeInstanceOf(UnexpectedError);
	});
});

describe("nyx.user.delete", () => {
	test("deletes the user's sessions before the user", async () => {
		const adapter = new MockAdapter();
		await adapter.insertUser({ id: "user-1", attributes: {} });
		await seedSession(adapter, "session-1", "user-1");
		await seedSession(adapter, "session-2", "user-1");
		const nyx = createNyx(adapter);

		const result = await nyx.user.delete("user-1");
		expect(result).toBeUndefined();
		expect(adapter.users.has("user-1")).toBe(false);
		expect(adapter.sessions.size).toBe(0);
	});

	test("leaves the user untouched when deleting sessions fails", async () => {
		const adapter = new MockAdapter();
		await adapter.insertUser({ id: "user-1", attributes: {} });
		await seedSession(adapter, "session-1", "user-1");
		adapter.fail("deleteSessionsByUserId");
		const nyx = createNyx(adapter);

		const result = await nyx.user.delete("user-1");
		expect(result).toBeInstanceOf(UnexpectedError);
		expect(adapter.users.has("user-1")).toBe(true);
		expect(adapter.sessions.has("session-1")).toBe(true);
	});

	test("returns UnexpectedError when deleting the user fails", async () => {
		const adapter = new MockAdapter();
		await adapter.insertUser({ id: "user-1", attributes: {} });
		await seedSession(adapter, "session-1", "user-1");
		adapter.fail("deleteUserById");
		const nyx = createNyx(adapter);

		const result = await nyx.user.delete("user-1");
		expect(result).toBeInstanceOf(UnexpectedError);
		expect(adapter.users.has("user-1")).toBe(true);
		expect(adapter.sessions.size).toBe(0);
	});
});
