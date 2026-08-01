import type { Adapter, Attributes } from "./adapter";
import { SessionAPI } from "./api/session";
import { UserAPI } from "./api/user";
import { TimeSpan } from "./time-span";

/**
 * Configuration options for the {@link Nyx} instance.
 *
 * @typeParam SessionSelect - Attributes stored on the session table, as selected from the database.
 * @typeParam SessionInsert - Attributes accepted when creating a session.
 * @typeParam SessionAttrs - Attributes exposed to the application via {@link NyxOptions.session.mapSessionAttributes}. Defaults to `SessionSelect`.
 * @typeParam UserSelect - Attributes stored on the user table, as selected from the database.
 * @typeParam UserInsert - Attributes accepted when creating a user.
 * @typeParam UserAttrs - Attributes exposed to the application via {@link NyxOptions.user.mapUserAttributes}. Defaults to `UserSelect`.
 */
export interface NyxOptions<
	SessionSelect extends object = object,
	SessionInsert extends object = object,
	SessionAttrs extends object = SessionSelect,
	UserSelect extends object = object,
	UserInsert extends object = object,
	UserAttrs extends object = UserSelect,
> {
	/** The database adapter used to persist sessions and users. */
	adapter: Adapter<Attributes<SessionSelect, SessionInsert>, Attributes<UserSelect, UserInsert>>;
	session: {
		/**
		 * How long a session stays valid after its last verified activity.
		 *
		 * @defaultValue {@link TimeSpan} of 10 days (`new TimeSpan(10, "d")`)
		 */
		inactivityTimeout?: TimeSpan;
		/**
		 * How often the `lastVerifiedAt` column is refreshed during validation.
		 *
		 * @defaultValue {@link TimeSpan} of 1 hour (`new TimeSpan(1, "h")`)
		 */
		activityCheckInterval?: TimeSpan;
		/**
		 * Maps the session attributes stored in the database to the attributes
		 * exposed to the application.
		 *
		 * Use this to strip sensitive columns (e.g. IP address, device name)
		 * from the values returned by {@link SessionAPI#validateToken}.
		 */
		mapSessionAttributes: (databaseSessionAttributes: SessionSelect) => SessionAttrs;
	};
	user: {
		/**
		 * Generates the id for new users.
		 *
		 * @defaultValue `() => crypto.randomUUID()`
		 */
		createId?: () => string;
		/**
		 * Maps the user attributes stored in the database to the attributes
		 * exposed to the application.
		 *
		 * Use this to strip sensitive columns (e.g. password hash) from the
		 * values returned by the user API.
		 */
		mapUserAttributes: (databaseUserAttributes: UserSelect) => UserAttrs;
	};
}

/**
 * The main entry point of nyx-auth. Manages sessions and users through a
 * database adapter.
 *
 * ### Example
 *
 * ```ts
 * import { Nyx } from "@nyx-auth/core";
 * import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter";
 *
 * export const nyx = new Nyx({
 * 	adapter: DrizzleAdapter.sqlite({ db, tables: { sessions, users } }),
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
 * ```
 */
export class Nyx<
	SessionSelect extends object = object,
	SessionInsert extends object = object,
	SessionAttrs extends object = SessionSelect,
	UserSelect extends object = object,
	UserInsert extends object = object,
	UserAttrs extends object = UserSelect,
> {
	/**
	 * The session API. Create, validate, invalidate and update sessions.
	 *
	 * Access the inferred session type via `typeof nyx.session.$infer`.
	 */
	readonly session: SessionAPI<SessionSelect, SessionInsert, SessionAttrs, UserSelect, UserAttrs>;

	/**
	 * The user API. Create, fetch, update and delete users.
	 *
	 * Access the inferred user type via `typeof nyx.user.$infer`.
	 */
	readonly user: UserAPI<UserSelect, UserInsert, UserAttrs>;

	/**
	 * Creates a new nyx-auth instance.
	 *
	 * @param options - Configuration for the instance, see {@link NyxOptions}.
	 * @throws {Error} If `session.inactivityTimeout` or `session.activityCheckInterval` is less than or equal to zero, or if `activityCheckInterval` is greater than or equal to `inactivityTimeout`.
	 */
	constructor(options: NyxOptions<SessionSelect, SessionInsert, SessionAttrs, UserSelect, UserInsert, UserAttrs>) {
		const inactivityTimeout = options.session.inactivityTimeout ?? new TimeSpan(10, "d");
		const activityCheckInterval = options.session.activityCheckInterval ?? new TimeSpan(1, "h");

		if (inactivityTimeout.milliseconds() <= 0) {
			throw new Error("Nyx: session.inactivityTimeout must be greater than zero");
		}
		if (activityCheckInterval.milliseconds() <= 0) {
			throw new Error("Nyx: session.activityCheckInterval must be greater than zero");
		}
		if (activityCheckInterval.milliseconds() >= inactivityTimeout.milliseconds()) {
			throw new Error("Nyx: session.activityCheckInterval must be less than session.inactivityTimeout");
		}

		const createId = options.user.createId ?? (() => crypto.randomUUID());

		this.session = new SessionAPI(
			options.adapter,
			inactivityTimeout,
			activityCheckInterval,
			options.session.mapSessionAttributes,
			options.user.mapUserAttributes
		);
		this.user = new UserAPI(options.adapter, createId, options.user.mapUserAttributes);
	}
}
