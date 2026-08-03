import * as errore from "errore";
import type { Context } from "hono";

export class DatabaseError extends errore.createTaggedError({
	name: "DatabaseError",
	message: "Something went wrong with $operation",
}) {
	toResponse(c: Context) {
		return c.json({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" }, 500);
	}
}
