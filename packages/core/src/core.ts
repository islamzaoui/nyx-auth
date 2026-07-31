import type { Adapter, Attributes } from "./adapter";
import { SessionAPI } from "./api/session";
import { UserAPI } from "./api/user";
import { TimeSpan } from "./time-span";

export interface NyxOptions<
	SessionSelect extends object = object,
	SessionInsert extends object = object,
	SessionAttrs extends object = SessionSelect,
	UserSelect extends object = object,
	UserInsert extends object = object,
	UserAttrs extends object = UserSelect,
> {
	adapter: Adapter<Attributes<SessionSelect, SessionInsert>, Attributes<UserSelect, UserInsert>>;
	session: {
		inactivityTimeout?: TimeSpan;
		activityCheckInterval?: TimeSpan;
		mapSessionAttributes: (databaseSessionAttributes: SessionSelect) => SessionAttrs;
	};
	user: {
		createId?: () => string;
		mapUserAttributes: (databaseUserAttributes: UserSelect) => UserAttrs;
	};
}

export class Nyx<
	SessionSelect extends object = object,
	SessionInsert extends object = object,
	SessionAttrs extends object = SessionSelect,
	UserSelect extends object = object,
	UserInsert extends object = object,
	UserAttrs extends object = UserSelect,
> {
	readonly session: SessionAPI<SessionSelect, SessionInsert, SessionAttrs, UserSelect, UserAttrs>;
	readonly user: UserAPI<UserSelect, UserInsert, UserAttrs>;

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
