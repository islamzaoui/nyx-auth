import { describe, expect, test } from "bun:test";
import { isSecretHash } from "../src/drivers/sanitize";

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
