import type { Env } from "hono";
import { createFactory } from "hono/factory";
import type { PinoLogger } from "hono-pino";
import { auth } from "@/middlewares/auth";
import { requireAuth } from "@/middlewares/require-auth";
import type { Session, User } from "./auth/nyx";

export interface BaseEnv extends Env {
	Variables: {
		logger: PinoLogger;
		user: User | null;
		session: Session | null;
	};
}

export const baseFactory = createFactory<BaseEnv>({
	initApp: (app) => app.use("*", auth),
});

export interface UserEnv extends BaseEnv {
	Variables: {
		logger: PinoLogger;
		user: User;
		session: Session;
	};
}

export const userFactory = createFactory<UserEnv>({
	initApp: (app) => app.use("*", requireAuth),
});
