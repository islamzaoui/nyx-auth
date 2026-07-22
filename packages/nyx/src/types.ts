/** biome-ignore-all lint/suspicious/noExplicitAny: module augmentation */
/** biome-ignore-all lint/complexity/noBannedTypes: module augmentation */
import type { RegisteredNyx } from ".";
import type { Nyx } from "./core";

export type SessionAttributes = RegisteredNyx extends Nyx<infer _SessionAttributes> ? _SessionAttributes : {};

export interface Session extends SessionAttributes {
	id: string;
	userId: string;
	secretHash: Uint8Array;
	createdAt: Date;
	lastVerifiedAt: Date;
}

export interface SessionWithToken extends Omit<Session, "secretHash"> {
	token: string;
}
