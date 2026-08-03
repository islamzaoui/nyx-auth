import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import z from "zod";

export const validator = <T extends z.ZodSchema, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
	zv(target, schema, (result, c) => {
		if (!result.success) {
			return c.json({ error: "VALIDATION_ERROR", details: z.flattenError(result.error) }, 422);
		}
	});
