import { getConnInfo } from "hono/bun";
import { authCookie } from "@/lib/auth/cookie";
import { nyx } from "@/lib/auth/nyx";
import { baseFactory } from "@/lib/factory";
import { requireAuth } from "@/middlewares/require-auth";
import { validator } from "@/middlewares/validator";
import { findUserByEmail } from "@/repositories/user";
import { LoginSchema, RegisterSchema } from "@/schemas/auth.schema";

const DUMMY_PASSWORD_HASH = await Bun.password.hash(crypto.randomUUID());
export const authRoute = baseFactory
	.createApp()
	.post("/register", validator("json", RegisterSchema), async (c) => {
		const data = c.req.valid("json");
		c.var.logger.assign({
			body: {
				email: data.email,
				name: data.name,
			},
		});

		const findResult = await findUserByEmail(data.email);
		if (findResult instanceof Error) {
			c.var.logger.error(findResult, "Error finding user by email");
			return findResult.toResponse(c);
		}

		if (findResult) {
			return c.json({ code: "EMAIL_EXISTS", message: "An account with this email already exists" }, 409);
		}

		const passwordHash = await Bun.password.hash(data.password);

		const userResult = await nyx.user.create({
			name: data.name,
			email: data.email,
			passwordHash,
		});
		if (userResult instanceof Error) {
			c.var.logger.error(userResult, "Error creating user");
			return c.json({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" }, 500);
		}

		const info = getConnInfo(c);
		const sessionResult = await nyx.session.create(userResult.id, {
			ipAddress: info.remote.address,
			userAgent: c.req.header("User-Agent"),
		});
		if (sessionResult instanceof Error) {
			c.var.logger.error(sessionResult, "Error creating session");
			return c.json({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" }, 500);
		}

		authCookie.set(c, sessionResult.token);

		return c.json({ code: "SUCCESS", user: userResult, session: sessionResult.value }, 200);
	})
	.post("/login", validator("json", LoginSchema), async (c) => {
		const data = c.req.valid("json");
		c.var.logger.assign({
			body: {
				email: data.email,
			},
		});

		const findResult = await findUserByEmail(data.email);
		if (findResult instanceof Error) {
			c.var.logger.error(findResult, "Error finding user by email");
			return findResult.toResponse(c);
		}

		if (!findResult) {
			// Use a dummy password hash to prevent timing attacks
			await Bun.password.verify(DUMMY_PASSWORD_HASH, data.password);
			return c.json({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" }, 401);
		}

		const isPasswordValid = await Bun.password.verify(findResult.passwordHash, data.password);
		if (!isPasswordValid) {
			return c.json({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" }, 401);
		}

		const info = getConnInfo(c);
		const sessionResult = await nyx.session.create(findResult.id, {
			ipAddress: info.remote.address,
			userAgent: c.req.header("User-Agent"),
		});
		if (sessionResult instanceof Error) {
			c.var.logger.error(sessionResult, "Error creating session");
			return c.json({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" }, 500);
		}

		const publicUser = await nyx.user.get(findResult.id);
		if (publicUser instanceof Error) {
			c.var.logger.error(publicUser, "Error fetching user");
			return c.json({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" }, 500);
		}

		authCookie.set(c, sessionResult.token);

		return c.json({ code: "SUCCESS", user: publicUser, session: sessionResult.value }, 200);
	})
	.post("/logout", requireAuth, async (c) => {
		const result = await nyx.session.invalidate(c.var.session.id);
		if (result instanceof Error) {
			c.var.logger.error(result, "Error invalidating session");
			return c.json({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" }, 500);
		}

		if (!result) {
			console.warn("Session was already gone:", c.var.session.id);
		}

		authCookie.delete(c);

		return c.json({ code: "SUCCESS", message: "Logged out successfully" }, 200);
	});

export type AppType = typeof authRoute;
