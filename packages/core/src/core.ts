import type { Adapter, Attributes } from "./adapter";
import { UnexpectedError } from "./errors";
import { SessionAPI } from "./session-api";
import { TimeSpan } from "./time-span";
import type { Session } from "./types";

export { UnexpectedError } from "./errors";

export interface NyxOptions<Select extends object = object, Insert extends object = object, SessionAttrs extends object = Select> {
	adapter: Adapter<Attributes<Select, Insert>>;
	session?: {
		inactivityTimeout?: TimeSpan;
		activityCheckInterval?: TimeSpan;
		mapSessionAttributes?: (databaseSessionAttributes: Select) => SessionAttrs;
	};
}

export class Nyx<Select extends object = object, Insert extends object = object, SessionAttrs extends object = Select> {
	readonly session: SessionAPI<Select, Insert, SessionAttrs>;

	constructor(options: NyxOptions<Select, Insert, SessionAttrs>) {
		const inactivityTimeout = options.session?.inactivityTimeout ?? new TimeSpan(10, "d");
		const activityCheckInterval = options.session?.activityCheckInterval ?? new TimeSpan(1, "h");
		const mapSessionAttributes = (attr: Select): SessionAttrs => {
			if (options.session?.mapSessionAttributes) return options.session.mapSessionAttributes(attr);
			return attr as unknown as SessionAttrs;
		};

		this.session = new SessionAPI(options.adapter, inactivityTimeout, activityCheckInterval, mapSessionAttributes);
	}

	get $inferSession(): Session<SessionAttrs> {
		return {} as Session<SessionAttrs>;
	}
}
