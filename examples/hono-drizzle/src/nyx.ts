import { Nyx } from "@nyx-auth/core";
import { DrizzleAdapter } from "@nyx-auth/drizzle-adapter";
import { db } from "./db";
import { sessions, users } from "./db/schema";

export const nyx = new Nyx({
	adapter: DrizzleAdapter.sqlite({ db, tables: { sessions, users } }),
});

export type Session = typeof nyx.session.$infer;

export type PublicSession = Omit<Session, "secretHash">;

export type User = typeof nyx.user.$infer;

export type PublicUser = Omit<User, "passwordHash">;

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
