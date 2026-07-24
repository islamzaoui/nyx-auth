import { Nyx } from "@nyx-auth/core";
import { SqliteAdapter } from "./db/adapter";

export const nyx = new Nyx<{ ipAddress: string }>({
	adapter: new SqliteAdapter(),
	session: {
		getSessionAttributes: (attrs) => ({
			ipAddress: attrs.ipAddress,
		}),
	},
});
