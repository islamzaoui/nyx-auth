import { describe, expect, test } from "bun:test";
import { stripSessionReservedAttributes, stripUserReservedAttributes } from "../../src/utils/attributes";

describe("stripSessionReservedAttributes", () => {
	test("removes all reserved base columns", () => {
		const stripped = stripSessionReservedAttributes({
			id: "spoof",
			userId: "spoof",
			secretHash: "spoof",
			createdAt: new Date(),
			lastVerifiedAt: new Date(),
			ipAddress: "1.2.3.4",
		});
		expect(stripped).not.toHaveProperty("id");
		expect(stripped).not.toHaveProperty("userId");
		expect(stripped).not.toHaveProperty("secretHash");
		expect(stripped).not.toHaveProperty("createdAt");
		expect(stripped).not.toHaveProperty("lastVerifiedAt");
		expect(stripped.ipAddress).toBe("1.2.3.4");
	});

	test("keeps custom attribute keys", () => {
		const stripped = stripSessionReservedAttributes({ ipAddress: "1.2.3.4", userAgent: "curl", role: "admin" });
		expect(stripped).toEqual({ ipAddress: "1.2.3.4", userAgent: "curl", role: "admin" });
	});

	test("drops undefined values but keeps null", () => {
		const stripped = stripSessionReservedAttributes({ a: undefined, b: null });
		expect(stripped).not.toHaveProperty("a");
		expect(stripped.b).toBeNull();
	});

	test("does not mutate the input object", () => {
		const input = { id: "keep-me", ipAddress: "1.2.3.4" };
		stripSessionReservedAttributes(input);
		expect(input).toEqual({ id: "keep-me", ipAddress: "1.2.3.4" });
	});
});

describe("stripUserReservedAttributes", () => {
	test("removes the reserved id column", () => {
		const stripped = stripUserReservedAttributes({ id: "spoof", email: "a@b.c" });
		expect(stripped).not.toHaveProperty("id");
		expect(stripped.email).toBe("a@b.c");
	});

	test("keeps other attributes including sensitive ones", () => {
		const stripped = stripUserReservedAttributes({ email: "a@b.c", passwordHash: "hash" });
		expect(stripped).toEqual({ email: "a@b.c", passwordHash: "hash" });
	});
});
