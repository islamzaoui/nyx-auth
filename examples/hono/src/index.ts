import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createUser, findUserByEmail, findUserById } from "./db/user";
import { nyx } from "./nyx";

const SESSION_COOKIE = "session";

const app = new Hono<{
	Variables: {
		ipAddress: string;
	};
}>();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.post("/register", async (c) => {
	const body = await c.req.json<{ email?: string; password?: string }>();
	const email = body.email?.trim().toLowerCase();
	const password = body.password;

	if (!email || !password) {
		return c.json({ error: "email and password are required" }, 400);
	}
	if (!email.includes("@")) {
		return c.json({ error: "invalid email" }, 400);
	}
	if (password.length < 8) {
		return c.json({ error: "password must be at least 8 characters" }, 400);
	}

	const existing = findUserByEmail(email);
	if (existing) {
		return c.json({ error: "an account with this email already exists" }, 409);
	}

	const passwordHash = await Bun.password.hash(password);
	const user = createUser(email, passwordHash);

	const result = await nyx.createSession(user.id, { ipAddress: c.var.ipAddress });
	if (result instanceof Error) {
		return c.json({ error: "failed to create session" }, 500);
	}

	setCookie(c, SESSION_COOKIE, result.token, {
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		path: "/",
	});

	return c.json({ ok: true, userId: user.id, email: user.email }, 201);
});

app.post("/login", async (c) => {
	const body = await c.req.json<{ email?: string; password?: string }>();
	const email = body.email?.trim().toLowerCase();
	const password = body.password;

	if (!email || !password) {
		return c.json({ error: "email and password are required" }, 400);
	}

	const user = findUserByEmail(email);
	if (!user) {
		return c.json({ error: "invalid email or password" }, 401);
	}

	const validPassword = await Bun.password.verify(password, user.passwordHash);
	if (!validPassword) {
		return c.json({ error: "invalid email or password" }, 401);
	}

	const result = await nyx.createSession(user.id, { ipAddress: c.var.ipAddress });
	if (result instanceof Error) {
		return c.json({ error: "failed to create session" }, 500);
	}

	setCookie(c, SESSION_COOKIE, result.token, {
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		path: "/",
	});

	return c.json({ ok: true, userId: user.id, email: user.email });
});

app.post("/logout", async (c) => {
	const token = getCookie(c, SESSION_COOKIE);
	if (token) {
		const sessionId = token.split(".")[0];
		if (sessionId) {
			await nyx.invalidateSession(sessionId);
		}
	}
	deleteCookie(c, SESSION_COOKIE, { path: "/" });
	return c.json({ ok: true });
});

app.get("/me", async (c) => {
	const token = getCookie(c, SESSION_COOKIE);
	if (!token) {
		return c.json({ error: "not authenticated" }, 401);
	}

	const session = await nyx.validateSessionToken(token);
	if (session instanceof Error) {
		return c.json({ error: "something went wrong" }, 500);
	}
	if (!session) {
		deleteCookie(c, SESSION_COOKIE, { path: "/" });
		return c.json({ error: "not authenticated" }, 401);
	}

	const user = findUserById(session.userId);
	if (!user) {
		return c.json({ error: "user no longer exists" }, 401);
	}

	return c.json({ userId: user.id, email: user.email, ipAddress: session.ipAddress });
});

const server = Bun.serve({
	port: 3000,
	fetch(request, server) {
		return app.fetch(request, {
			ipAddress: server.requestIP(request)?.address ?? "unknown",
		});
	},
});

console.log(`Server running on ${server.url.href}`);
