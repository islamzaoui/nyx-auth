import { Hono } from "hono";
import { getConnInfo } from "hono/bun";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { nyx } from "./nyx";
import { findUserByEmail } from "./user";

const SESSION_COOKIE = "session";
const MAX_PASSWORD_LENGTH = 72;

// Derived at startup so the dummy always uses the same argon2id parameters as
// real hashing, keeping the login timing path equal for unknown emails.
const DUMMY_PASSWORD_HASH = await Bun.password.hash(crypto.randomUUID());

const app = new Hono();

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
	if (password.length > MAX_PASSWORD_LENGTH) {
		return c.json({ error: "password must be at most 72 characters" }, 400);
	}

	const existing = await findUserByEmail(email);
	if (existing) {
		return c.json({ error: "an account with this email already exists" }, 409);
	}

	const passwordHash = await Bun.password.hash(password);

	const userResult = await nyx.user.create({ email, passwordHash, createdAt: new Date().toISOString() });
	if (userResult instanceof Error) {
		console.error("Failed to create user:", userResult);
		return c.json({ error: "failed to create user" }, 500);
	}

	const result = await nyx.session.create(userResult.id, { ipAddress: getConnInfo(c).remote.address ?? "unknown" });
	if (result instanceof Error) {
		console.error("Failed to create session:", result);
		return c.json({ error: "failed to create session" }, 500);
	}

	setCookie(c, SESSION_COOKIE, result.token, {
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		path: "/",
	});

	return c.json({ message: "registered successfully", user: userResult, session: result.value }, 200);
});

app.post("/login", async (c) => {
	const body = await c.req.json<{ email?: string; password?: string }>();
	const email = body.email?.trim().toLowerCase();
	const password = body.password;

	if (!email || !password) {
		return c.json({ error: "email and password are required" }, 400);
	}
	if (password.length > MAX_PASSWORD_LENGTH) {
		return c.json({ error: "password must be at most 72 characters" }, 400);
	}

	const user = await findUserByEmail(email);

	const validPassword = await Bun.password.verify(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
	if (!user || !validPassword) {
		return c.json({ error: "invalid email or password" }, 401);
	}

	const result = await nyx.session.create(user.id, { ipAddress: getConnInfo(c).remote.address ?? "unknown" });
	if (result instanceof Error) {
		console.error("Failed to create session:", result);
		return c.json({ error: "failed to create session" }, 500);
	}

	setCookie(c, SESSION_COOKIE, result.token, {
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		path: "/",
	});

	// Fetch the public shape (password hash stripped) for the response
	const publicUser = await nyx.user.get(user.id);
	if (publicUser instanceof Error) {
		console.error("Failed to fetch user:", publicUser);
		return c.json({ error: "failed to fetch user" }, 500);
	}

	return c.json({ message: "logged in successfully", user: publicUser, session: result.value }, 200);
});

app.post("/logout", async (c) => {
	const token = getCookie(c, SESSION_COOKIE);
	if (token) {
		const result = await nyx.session.validateToken(token);
		if (result && !(result instanceof Error)) {
			const deleted = await nyx.session.invalidate(result.session.id);
			if (!deleted) {
				console.warn("Session was already gone:", result.session.id);
			}
		}
	}
	deleteCookie(c, SESSION_COOKIE, { path: "/" });
	return c.json({ message: "logged out" });
});

app.get("/me", async (c) => {
	const token = getCookie(c, SESSION_COOKIE);
	if (!token) {
		return c.json({ error: "not authenticated" }, 401);
	}

	const result = await nyx.session.validateToken(token);
	if (result instanceof Error) {
		console.error("Failed to validate session:", result);
		return c.json({ error: "something went wrong" }, 500);
	}
	if (!result) {
		deleteCookie(c, SESSION_COOKIE, { path: "/" });
		return c.json({ error: "not authenticated" }, 401);
	}

	const { session, user } = result;

	return c.json({ message: "user info retrieved successfully", user, session });
});

export default app;
