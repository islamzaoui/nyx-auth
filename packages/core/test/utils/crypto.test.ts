import { describe, expect, test } from "bun:test";
import { constantTimeEqual, generateSessionId, hashSecret } from "../../src/utils/crypto";

const ALPHABET = new Set("abcdefghijkmnpqrstuvwxyz23456789".split(""));

describe("generateSessionId", () => {
	test("returns a 32 character id", () => {
		expect(generateSessionId()).toHaveLength(32);
	});

	test("only uses characters from the alphabet", () => {
		for (let i = 0; i < 1000; i++) {
			for (const char of generateSessionId()) {
				expect(ALPHABET.has(char)).toBe(true);
			}
		}
	});

	test("generates unique ids", () => {
		const ids = new Set<string>();
		for (let i = 0; i < 10_000; i++) {
			ids.add(generateSessionId());
		}
		expect(ids.size).toBe(10_000);
	});

	test("output is uniformly distributed across the 32 character alphabet", () => {
		const counts = new Map<string, number>();
		const total = 100_000;
		for (let i = 0; i < total; i++) {
			const char = generateSessionId().charAt(0);
			counts.set(char, (counts.get(char) ?? 0) + 1);
		}
		expect(counts.size).toBe(32);
		const expected = total / 32;
		for (const count of counts.values()) {
			expect(count).toBeGreaterThan(expected * 0.9);
			expect(count).toBeLessThan(expected * 1.1);
		}
	});
});

describe("hashSecret", () => {
	test("returns a 32 byte SHA-256 digest", async () => {
		const hash = await hashSecret("secret");
		expect(hash).toBeInstanceOf(Uint8Array);
		expect(hash.byteLength).toBe(32);
	});

	test("is deterministic", async () => {
		expect(await hashSecret("same")).toEqual(await hashSecret("same"));
	});

	test("differs for different secrets", async () => {
		expect(await hashSecret("a")).not.toEqual(await hashSecret("b"));
	});

	test("handles the empty string", async () => {
		expect((await hashSecret("")).byteLength).toBe(32);
	});
});

describe("constantTimeEqual", () => {
	test("returns true for identical bytes", () => {
		const value = new Uint8Array([1, 2, 3, 4]);
		expect(constantTimeEqual(value, value.slice())).toBe(true);
	});

	test("returns false when a single byte differs", () => {
		const a = new Uint8Array([1, 2, 3, 4]);
		const b = new Uint8Array([1, 2, 3, 5]);
		expect(constantTimeEqual(a, b)).toBe(false);
	});

	test("returns false for a prefix mismatch early in the buffer", () => {
		const a = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]);
		const b = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]);
		expect(constantTimeEqual(a, b)).toBe(false);
	});

	test("returns false for different lengths", () => {
		const a = new Uint8Array([1, 2, 3]);
		const b = new Uint8Array([1, 2, 3, 4]);
		expect(constantTimeEqual(a, b)).toBe(false);
	});

	test("returns true for two empty arrays", () => {
		expect(constantTimeEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
	});

	test("compares against a Buffer the same way", () => {
		const a = new Uint8Array([9, 8, 7]);
		const b = Buffer.from([9, 8, 7]);
		expect(constantTimeEqual(a, b)).toBe(true);
	});
});
