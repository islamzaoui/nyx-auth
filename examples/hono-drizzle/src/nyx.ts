import { Nyx } from "@nyx-auth/core";
import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter";
import { db } from "./db";
import { sessions } from "./db/schema";
import type { PublicUser, User } from "./user";

export const nyx = new Nyx({
	adapter: DrizzleAdapter.sqlite({ db, tables: { sessions } }),
});

export type Session = typeof nyx.session.$infer;

export type PublicSession = Omit<Session, "secretHash">;

export function toPublicSession(session: Session): PublicSession {
	return {
		id: session.id,
		userId: session.userId,
		name: session.name,
		ipAddress: session.ipAddress,
		createdAt: session.createdAt,
		lastVerifiedAt: session.lastVerifiedAt,
	};
}

export function toPublicUser(user: User): PublicUser {
	return {
		id: user.id,
		email: user.email,
		createdAt: user.createdAt,
	};
}
