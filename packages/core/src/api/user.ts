import type { Adapter, Attributes } from "../adapter";
import type { Nyx } from "../core";
import { UnexpectedError } from "../errors";
import { stripUserReservedAttributes } from "../utils/attributes";
import type { User } from "../utils/types";

/**
 * The user API, accessed through `nyx.user.*` on a {@link Nyx} instance.
 *
 * Handles creating, fetching, updating and deleting users. Public methods
 * never throw — on failure they return an {@link UnexpectedError} instead.
 * Check with `result instanceof Error`.
 *
 * @typeParam Select - User attributes as stored in the database.
 * @typeParam Insert - User attributes accepted when creating a user.
 * @typeParam UserAttrs - User attributes exposed to the application.
 */
export class UserAPI<Select extends object = object, Insert extends object = object, UserAttrs extends object = Select> {
	private readonly adapter: Adapter<Attributes, Attributes<Select, Insert>>;
	private readonly createId: () => string;
	private readonly mapUserAttributes: (databaseUserAttributes: Select) => UserAttrs;

	constructor(
		adapter: Adapter<Attributes, Attributes<Select, Insert>>,
		createId: () => string,
		mapUserAttributes: (databaseUserAttributes: Select) => UserAttrs
	) {
		this.adapter = adapter;
		this.createId = createId;
		this.mapUserAttributes = mapUserAttributes;
	}

	/**
	 * The inferred shape of users handled by this instance.
	 *
	 * Use `typeof nyx.user.$infer` to derive the user type:
	 *
	 * ```ts
	 * import { nyx } from "./nyx";
	 *
	 * export type User = typeof nyx.user.$infer;
	 * ```
	 */
	get $infer(): User<UserAttrs> {
		return {} as User<UserAttrs>;
	}

	/**
	 * Creates a new user and returns the public user shape.
	 *
	 * ### Example
	 *
	 * ```ts
	 * const result = await nyx.user.create({
	 * 	email,
	 * 	passwordHash,
	 * 	createdAt: new Date().toISOString(),
	 * });
	 * if (result instanceof Error) {
	 * 	// handle UnexpectedError
	 * }
	 * ```
	 *
	 * @param attributes - User attributes to store.
	 * @returns The created user (with `mapUserAttributes` applied), or an
	 * {@link UnexpectedError} on failure.
	 */
	async create(attributes: Insert): Promise<User<UserAttrs> | UnexpectedError> {
		try {
			const id = this.createId();

			const insertResult = await this.adapter.insertUser({
				id,
				attributes: stripUserReservedAttributes(attributes),
			});
			if (insertResult instanceof Error) {
				return new UnexpectedError(insertResult);
			}

			return {
				...this.mapUserAttributes(insertResult.attributes),
				id: insertResult.id,
			};
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}

	/**
	 * Fetches a user by its id and returns the public user shape.
	 *
	 * ### Example
	 *
	 * ```ts
	 * const user = await nyx.user.get(userId);
	 * if (user instanceof Error) {
	 * 	// handle UnexpectedError
	 * }
	 * if (!user) {
	 * 	// user does not exist
	 * }
	 * ```
	 *
	 * @param id - The id of the user to fetch.
	 * @returns The user (with `mapUserAttributes` applied), `null` if no user
	 * with that id exists, or an {@link UnexpectedError} on failure.
	 */
	async get(id: string): Promise<User<UserAttrs> | null | UnexpectedError> {
		try {
			const user = await this.adapter.findUserById(id);
			if (user instanceof Error) {
				return new UnexpectedError(user);
			}
			if (!user) return null;

			return {
				...this.mapUserAttributes(user.attributes),
				id: user.id,
			};
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}

	/**
	 * Updates the attributes of a user.
	 *
	 * @param id - The id of the user to update.
	 * @param attributes - The attributes to update. The reserved `id` column
	 * is ignored.
	 * @returns `undefined` on success, or an {@link UnexpectedError} on failure.
	 */
	async updateAttributes(id: string, attributes: Partial<Select>): Promise<undefined | UnexpectedError> {
		try {
			const result = await this.adapter.updateUserbyId(id, {
				attributes: stripUserReservedAttributes(attributes),
			});
			if (result instanceof Error) {
				return new UnexpectedError(result);
			}
			return undefined;
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}

	/**
	 * Deletes a user by its id and invalidates all of their sessions.
	 *
	 * Sessions are deleted first; if that fails, the user is left untouched
	 * so the operation can be retried. If it succeeds but deleting the user
	 * fails, the user remains with no active sessions.
	 *
	 * @param id - The id of the user to delete.
	 * @returns `undefined` on success, or an {@link UnexpectedError} on failure.
	 */
	async delete(id: string): Promise<undefined | UnexpectedError> {
		try {
			const sessionsResult = await this.adapter.deleteSessionsByUserId(id);
			if (sessionsResult instanceof Error) {
				return new UnexpectedError(sessionsResult);
			}

			const result = await this.adapter.deleteUserById(id);
			if (result instanceof Error) {
				return new UnexpectedError(result);
			}
			return undefined;
		} catch (cause) {
			return new UnexpectedError(cause);
		}
	}
}
