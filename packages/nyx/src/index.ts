/** biome-ignore-all lint/suspicious/noExplicitAny: module augmentation */
/** biome-ignore-all lint/complexity/noBannedTypes: module augmentation */
/** biome-ignore-all lint/suspicious/noEmptyInterface: module augmentation */
export type { Adapter, DatabaseSession } from "./adapter";
export type { NyxOptions } from "./core";
export { Nyx, UnexpectedError } from "./core";
export { TimeSpan } from "./time-span";
export type { Session, SessionWithToken } from "./types";

import type { Nyx } from "./core";

export interface Register {}

export type RegisteredNyx = Register extends {
	Nyx: infer _Nyx;
}
	? _Nyx extends Nyx<any>
		? _Nyx
		: Nyx
	: Nyx;

export type RegisteredDatabaseSessionAttributes = Register extends {
	DatabaseSessionAttributes: infer _DatabaseSessionAttributes;
}
	? _DatabaseSessionAttributes
	: {};
