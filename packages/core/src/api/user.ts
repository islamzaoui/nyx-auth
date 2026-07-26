import { type Adapter, AdapterError, type Attributes } from "../adapter";
import { UnexpectedError } from "../errors";
import type { User } from "../utils/types";

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

	get $inferUser(): User<UserAttrs> {
		return {} as User<UserAttrs>;
	}

	async createUser(attributes: Insert): Promise<User<UserAttrs> | UnexpectedError> {
		const id = this.createId();

		const insertResult = await this.adapter.insertUser({
			id,
			attributes,
		});
		if (insertResult instanceof AdapterError) {
			return new UnexpectedError(insertResult);
		}

		return {
			id: insertResult.id,
			...this.mapUserAttributes(insertResult.attributes),
		};
	}

	async getUser(id: string): Promise<User<UserAttrs> | null | UnexpectedError> {
		const user = await this.adapter.findUserById(id);
		if (user instanceof AdapterError) {
			return new UnexpectedError(user);
		}
		if (!user) return null;

		return {
			id: user.id,
			...this.mapUserAttributes(user.attributes),
		};
	}

	async updateUserAttributes(id: string, attributes: Partial<Select>): Promise<undefined | UnexpectedError> {
		const result = await this.adapter.updateUserbyId(id, { attributes });
		if (result instanceof AdapterError) {
			return new UnexpectedError(result);
		}
		return undefined;
	}

	async deleteUser(id: string): Promise<undefined | UnexpectedError> {
		const result = await this.adapter.deleteUserById(id);
		if (result instanceof AdapterError) {
			return new UnexpectedError(result);
		}
		return undefined;
	}
}
