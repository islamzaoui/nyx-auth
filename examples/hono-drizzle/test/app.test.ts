import { describe, expect, test } from "bun:test";
import { testClient } from "hono/testing";
import app from "../src/index";

const client = testClient(app);

const SESSION_COOKIE = "session";

type AuthResponse = {
	message?: string;
	user?: {
		id?: string;
		name?: string | null;
		email?: string;
	};
	session?: unknown;
};

let emailCounter = 0;
function uniqueEmail(): string {
	emailCounter += 1;
	return `user-${emailCounter}-${Date.now()}@example.com`;
}

async function jsonBody<T>(res: { json(): Promise<unknown> }): Promise<T> {
	return (await res.json()) as T;
}

function sessionCookie(res: { headers: Headers }): string {
	const setCookie = res.headers.getSetCookie().find((header) => header.startsWith(`${SESSION_COOKIE}=`));
	const token = setCookie?.split(";")[0]?.split("=")[1];
	return token ? `${SESSION_COOKIE}=${token}` : "";
}

describe("register", () => {
	test("creates a user, returns the public shape, and sets a session cookie", async () => {
		const email = uniqueEmail();
		const res = await client.register.$post({
			json: { name: "Alice", email, password: "password123" },
		});

		expect(res.status).toBe(200);
		const body = await jsonBody<AuthResponse>(res);
		expect(body.user).toMatchObject({ name: "Alice", email });
		expect(body.user).not.toHaveProperty("passwordHash");
		expect(sessionCookie(res)).toStartWith("session=");
	});

	test("stores an empty name as absent", async () => {
		const res = await client.register.$post({
			json: { name: "   ", email: uniqueEmail(), password: "password123" },
		});

		expect(res.status).toBe(200);
		const body = await jsonBody<AuthResponse>(res);
		expect(body.user?.name).toBeNull();
	});

	test("rejects requests missing email or password", async () => {
		const noEmail = await client.register.$post({ json: { password: "password123" } });
		expect(noEmail.status).toBe(400);

		const noPassword = await client.register.$post({ json: { email: uniqueEmail() } });
		expect(noPassword.status).toBe(400);
	});

	test("rejects invalid email", async () => {
		const res = await client.register.$post({ json: { email: "not-an-email", password: "password123" } });
		expect(res.status).toBe(400);
	});

	test("rejects passwords shorter than 8 characters", async () => {
		const res = await client.register.$post({ json: { email: uniqueEmail(), password: "short" } });
		expect(res.status).toBe(400);
	});

	test("rejects passwords longer than 72 characters", async () => {
		const res = await client.register.$post({ json: { email: uniqueEmail(), password: "a".repeat(73) } });
		expect(res.status).toBe(400);
	});

	test("returns 409 for a duplicate email", async () => {
		const email = uniqueEmail();
		const first = await client.register.$post({ json: { email, password: "password123" } });
		expect(first.status).toBe(200);

		const second = await client.register.$post({ json: { email, password: "password123" } });
		expect(second.status).toBe(409);
	});
});

describe("login", () => {
	async function registeredUser(password = "password123"): Promise<{ email: string }> {
		const email = uniqueEmail();
		const res = await client.register.$post({ json: { email, password } });
		expect(res.status).toBe(200);
		return { email };
	}

	test("returns a session cookie on valid credentials", async () => {
		const { email } = await registeredUser();
		const res = await client.login.$post({ json: { email, password: "password123" } });

		expect(res.status).toBe(200);
		expect(sessionCookie(res)).toStartWith("session=");
	});

	test("rejects a wrong password", async () => {
		const { email } = await registeredUser();
		const res = await client.login.$post({ json: { email, password: "wrong-password" } });
		expect(res.status).toBe(401);
	});

	test("rejects an unknown email", async () => {
		const res = await client.login.$post({ json: { email: uniqueEmail(), password: "password123" } });
		expect(res.status).toBe(401);
	});
});

describe("me", () => {
	async function registerAndGetCookie(): Promise<{ email: string; cookie: string }> {
		const email = uniqueEmail();
		const res = await client.register.$post({ json: { email, password: "password123" } });
		expect(res.status).toBe(200);
		return { email, cookie: sessionCookie(res) };
	}

	test("returns 401 without a cookie", async () => {
		const res = await client.me.$get();
		expect(res.status).toBe(401);
	});

	test("returns 401 for an invalid token", async () => {
		const res = await client.me.$get({}, { headers: { cookie: `${SESSION_COOKIE}=invalid-token` } });
		expect(res.status).toBe(401);
	});

	test("returns the user and session for a valid cookie", async () => {
		const { email, cookie } = await registerAndGetCookie();
		const res = await client.me.$get({}, { headers: { cookie } });

		expect(res.status).toBe(200);
		const body = await jsonBody<AuthResponse>(res);
		expect(body.user?.email).toBe(email);
		expect(body.session).toBeDefined();
	});
});

describe("logout", () => {
	test("invalidates the session so a subsequent /me returns 401", async () => {
		const res = await client.register.$post({ json: { email: uniqueEmail(), password: "password123" } });
		expect(res.status).toBe(200);
		const cookie = sessionCookie(res);

		const logout = await client.logout.$post({}, { headers: { cookie } });
		expect(logout.status).toBe(200);

		const after = await client.me.$get({}, { headers: { cookie } });
		expect(after.status).toBe(401);
	});
});
