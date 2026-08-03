import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export const authCookie = {
	get: (c: Context) => getCookie(c, "auth"),
	set: (c: Context, value: string) =>
		setCookie(c, "auth", value, {
			httpOnly: true,
			secure: true,
			sameSite: "Lax",
			path: "/",
		}),
	delete: (c: Context) => deleteCookie(c, "auth", { path: "/" }),
};
