import { createMiddleware } from "hono/factory";
import type { UserEnv } from "@/lib/factory";

export const requireAuth = createMiddleware<UserEnv>(async (c, next) => {
	if (!c.var.user || !c.var.session) {
		return c.json({ code: "UNAUTHORIZED", message: "You are not authenticated to access this resource" }, 401);
	}

	return await next();
});
