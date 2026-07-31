const SESSION_RESERVED_KEYS = new Set(["id", "userId", "secretHash", "createdAt", "lastVerifiedAt"]);
const USER_RESERVED_KEYS = new Set(["id"]);

export function stripSessionReservedAttributes<A extends Record<string, any>>(attributes: A | undefined): A {
	const result = { ...(attributes ?? {}) } as Record<string, unknown>;
	for (const key of SESSION_RESERVED_KEYS) {
		delete result[key];
	}
	return result as A;
}

export function stripUserReservedAttributes<A extends Record<string, any>>(attributes: A | undefined): A {
	const result = { ...(attributes ?? {}) } as Record<string, unknown>;
	for (const key of USER_RESERVED_KEYS) {
		delete result[key];
	}
	return result as A;
}
