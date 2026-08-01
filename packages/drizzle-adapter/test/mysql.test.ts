import { describe, expect, test } from "bun:test";
import { affectedRows } from "../src/drivers/mysql";

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
