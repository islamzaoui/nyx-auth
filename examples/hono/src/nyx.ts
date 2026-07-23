import { Nyx } from "@nyx-auth/core";
import { SqliteAdapter } from "./db/adapter";

export const nyx = new Nyx({
	adapter: new SqliteAdapter(),
	session: {
		getSessionAttributes: (attrs) => ({
			ipAddress: attrs.ipAddress,
		}),
	},
});

declare module "@nyx-auth/core" {
	interface Register {
		Nyx: typeof nyx;
		DatabaseSessionAttributes: {
			ipAddress: string;
		};
	}
}
