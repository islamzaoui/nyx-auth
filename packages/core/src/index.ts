/**
 * @packageDocumentation
 *
 * The core library for nyx-auth. Provides session management and user
 * management on top of a database adapter.
 *
 * ### Installation
 *
 * ```sh
 * bun add @nyx-auth/core
 * ```
 *
 * ### Minimal setup
 *
 * ```ts
 * import { Nyx } from "@nyx-auth/core";
 *
 * const nyx = new Nyx({
 * 	adapter: myAdapter, // any {@link Adapter} implementation
 * 	session: {
 * 		mapSessionAttributes: (attributes) => ({
 * 			ipAddress: attributes.ipAddress,
 * 		}),
 * 	},
 * 	user: {
 * 		mapUserAttributes: (attributes) => ({
 * 			email: attributes.email,
 * 		}),
 * 	},
 * });
 *
 * // Create a session and validate it later
 * const created = await nyx.session.create(userId, { ipAddress: "127.0.0.1" });
 * if (created instanceof Error) {
 * 	// handle UnexpectedError
 * }
 * const result = await nyx.session.validateToken(created.token);
 * ```
 */
export { type Adapter, AdapterError, type Attributes, type DatabaseSession, type DatabaseUser } from "./adapter";
export { Nyx, type NyxOptions } from "./core";
export { UnexpectedError } from "./errors";
export { TimeSpan } from "./time-span";
