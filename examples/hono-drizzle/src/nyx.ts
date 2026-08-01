import { Nyx } from "@nyx-auth/core";
import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter";
import { db } from "./db";
import { sessions, users } from "./db/schema";

export const nyx = new Nyx({
	adapter: DrizzleAdapter.sqlite({ db, tables: { sessions, users } }),
	user: {
		// Never expose the password hash to the application layer
		mapUserAttributes: (attributes) => ({
			email: attributes.email,
			createdAt: attributes.createdAt,
		}),
	},
	session: {
		mapSessionAttributes: (attributes) => ({
			ipAddress: attributes.ipAddress,
			name: attributes.name,
		}),
	},
});

export type Session = typeof nyx.session.$infer;

export type User = typeof nyx.user.$infer;
