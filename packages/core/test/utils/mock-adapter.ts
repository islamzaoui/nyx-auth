import { expect } from "bun:test";
import { type Adapter, AdapterError, type Attributes, type DatabaseSession, type DatabaseUser, type Nyx } from "../../src";

export type Attrs = Record<string, unknown>;
export type SessionAttrs = { ipAddress: unknown };
export type UserAttrs = { email: unknown };
type MockSessionAttributes = Attributes<Attrs, Attrs>;
type MockUserAttributes = Attributes<Attrs, Attrs>;
export type TestNyx = Nyx<Attrs, Attrs, SessionAttrs, Attrs, Attrs, UserAttrs>;

/**
 * Asserts that a nyx-auth result is not an error and not null, and narrows the
 * type to the success value.
 */
export function expectResult<T>(result: T): Exclude<NonNullable<T>, Error> {
	expect(result).not.toBeInstanceOf(Error);
	expect(result).not.toBeNull();
	return result as Exclude<NonNullable<T>, Error>;
}

type AdapterOperation =
	| "insertSession"
	| "updateSessionbyId"
	| "deleteSessionById"
	| "deleteSessionsByUserId"
	| "deleteExpiredSessions"
	| "insertUser"
	| "findUserById"
	| "updateUserbyId"
	| "deleteUserById"
	| "findSessionWithUserById";

export class MockAdapter implements Adapter<MockSessionAttributes, MockUserAttributes> {
	sessions = new Map<string, DatabaseSession<Attrs>>();
	users = new Map<string, DatabaseUser<Attrs>>();
	calls: AdapterOperation[] = [];
	private failures = new Set<AdapterOperation>();

	constructor(options?: { sessions?: DatabaseSession<Attrs>[]; users?: DatabaseUser<Attrs>[] }) {
		for (const session of options?.sessions ?? []) this.sessions.set(session.id, session);
		for (const user of options?.users ?? []) this.users.set(user.id, user);
	}

	fail(operation: AdapterOperation) {
		this.failures.add(operation);
	}

	clearFailures() {
		this.failures.clear();
	}

	private guard(operation: AdapterOperation): AdapterError | undefined {
		this.calls.push(operation);
		if (this.failures.has(operation)) {
			return new AdapterError({ operation, cause: new Error(`mock failure for ${operation}`) });
		}
		return undefined;
	}

	async insertSession(session: DatabaseSession<Attrs>): Promise<DatabaseSession<Attrs> | AdapterError> {
		const error = this.guard("insertSession");
		if (error) return error;
		this.sessions.set(session.id, { ...session, attributes: { ...session.attributes } });
		return session;
	}

	async updateSessionbyId(
		sessionId: string,
		session: Partial<Omit<DatabaseSession<Partial<Attrs>>, "id" | "userId">>
	): Promise<undefined | AdapterError> {
		const error = this.guard("updateSessionbyId");
		if (error) return error;
		const existing = this.sessions.get(sessionId);
		if (existing) {
			const { attributes: patchAttributes, ...patchBase } = session;
			this.sessions.set(sessionId, {
				...existing,
				...patchBase,
				attributes: { ...existing.attributes, ...(patchAttributes ?? {}) },
			});
		}
		return undefined;
	}

	async deleteSessionById(sessionId: string): Promise<boolean | AdapterError> {
		const error = this.guard("deleteSessionById");
		if (error) return error;
		return this.sessions.delete(sessionId);
	}

	async deleteSessionsByUserId(userId: string): Promise<boolean | AdapterError> {
		const error = this.guard("deleteSessionsByUserId");
		if (error) return error;
		let deleted = false;
		for (const [id, session] of this.sessions) {
			if (session.userId === userId) {
				this.sessions.delete(id);
				deleted = true;
			}
		}
		return deleted;
	}

	async deleteExpiredSessions(olderThan: Date): Promise<number | AdapterError> {
		const error = this.guard("deleteExpiredSessions");
		if (error) return error;
		let count = 0;
		for (const [id, session] of this.sessions) {
			if (session.lastVerifiedAt.getTime() <= olderThan.getTime()) {
				this.sessions.delete(id);
				count++;
			}
		}
		return count;
	}

	async insertUser(user: DatabaseUser<Attrs>): Promise<DatabaseUser<Attrs> | AdapterError> {
		const error = this.guard("insertUser");
		if (error) return error;
		this.users.set(user.id, { ...user, attributes: { ...user.attributes } });
		return user;
	}

	async findUserById(userId: string): Promise<DatabaseUser<Attrs> | null | AdapterError> {
		const error = this.guard("findUserById");
		if (error) return error;
		return this.users.get(userId) ?? null;
	}

	async updateUserbyId(userId: string, user: Partial<Omit<DatabaseUser<Partial<Attrs>>, "id">>): Promise<undefined | AdapterError> {
		const error = this.guard("updateUserbyId");
		if (error) return error;
		const existing = this.users.get(userId);
		if (existing) {
			const { attributes: patchAttributes, ...patchBase } = user;
			this.users.set(userId, {
				...existing,
				...patchBase,
				attributes: { ...existing.attributes, ...(patchAttributes ?? {}) },
			});
		}
		return undefined;
	}

	async deleteUserById(userId: string): Promise<undefined | AdapterError> {
		const error = this.guard("deleteUserById");
		if (error) return error;
		this.users.delete(userId);
		return undefined;
	}

	async findSessionWithUserById(sessionId: string): Promise<{ session: DatabaseSession<Attrs>; user: DatabaseUser<Attrs> } | null | AdapterError> {
		const error = this.guard("findSessionWithUserById");
		if (error) return error;
		const session = this.sessions.get(sessionId);
		if (!session) return null;
		const user = this.users.get(session.userId);
		if (!user) return null;
		return { session, user };
	}
}
