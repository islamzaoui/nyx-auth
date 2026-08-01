import { describe, expect, test } from "bun:test";
import { TimeSpan } from "../src";

describe("TimeSpan", () => {
	test("converts units to milliseconds", () => {
		expect(new TimeSpan(1, "ms").milliseconds()).toBe(1);
		expect(new TimeSpan(1, "s").milliseconds()).toBe(1000);
		expect(new TimeSpan(1, "m").milliseconds()).toBe(60_000);
		expect(new TimeSpan(1, "h").milliseconds()).toBe(3_600_000);
		expect(new TimeSpan(1, "d").milliseconds()).toBe(86_400_000);
		expect(new TimeSpan(1, "w").milliseconds()).toBe(604_800_000);
	});

	test("rejects non-finite values", () => {
		expect(() => new TimeSpan(Number.NaN, "d")).toThrow();
		expect(() => new TimeSpan(Number.POSITIVE_INFINITY, "d")).toThrow();
	});

	test("elapsedSince returns true once the span has elapsed", () => {
		const span = new TimeSpan(10, "m");
		const from = new Date("2026-01-01T00:00:00.000Z");
		expect(span.elapsedSince(from, new Date("2026-01-01T00:09:59.999Z"))).toBe(false);
		expect(span.elapsedSince(from, new Date("2026-01-01T00:10:00.000Z"))).toBe(true);
		expect(span.elapsedSince(from, new Date("2026-01-01T01:00:00.000Z"))).toBe(true);
	});

	test("toDate returns a date ahead of now", () => {
		const before = Date.now();
		const date = new TimeSpan(1, "h").toDate();
		expect(date.getTime()).toBeGreaterThanOrEqual(before + 3_600_000 - 1);
	});
});
