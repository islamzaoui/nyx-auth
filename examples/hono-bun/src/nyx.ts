import { Nyx } from "@nyx-auth/core";
import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter";
import { db } from "./db";
import { sessions } from "./db/schema";

export const nyx = new Nyx({
	adapter: DrizzleAdapter.sqlite({ db, tables: { sessions } }),
	session: {
		getSessionAttributes: (attrs) => ({
			ipAddress: attrs.ipAddress,
			role: attrs.role,
		}),
	},
});
