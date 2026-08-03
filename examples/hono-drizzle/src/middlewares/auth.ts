import { createMiddleware } from "hono/factory";
import { authCookie } from "@/lib/auth/cookie";
import { nyx } from "@/lib/auth/nyx";

export const auth = createMiddleware(async (c, next) => {
	c.set("session", null);
	c.set("user", null);

	const token = authCookie.get(c);
	if (!token) {
		return await next();
	}

	const result = await nyx.session.validateToken(token);
	if (result instanceof Error) {
		c.var.logger.error(result, "Error validating session token");
		return c.json({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" }, 500);
	}

	if (!result) {
		return await next();
	}

	c.set("session", result.session);
	c.set("user", result.user);

	return await next();
});
