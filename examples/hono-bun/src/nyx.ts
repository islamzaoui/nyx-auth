import { Nyx } from "@nyx-auth/core";
import { SqliteAdapter } from "./db/adapter";

interface SessionAttributes {
	ipAddress: string;
}

export const nyx = new Nyx<SessionAttributes>({
	adapter: new SqliteAdapter(),
	session: {
		getSessionAttributes: (attrs) => ({
			ipAddress: attrs.ipAddress,
		}),
	},
});
