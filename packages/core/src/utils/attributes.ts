const SESSION_RESERVED_KEYS = new Set(["id", "userId", "secretHash", "createdAt", "lastVerifiedAt"]);
const USER_RESERVED_KEYS = new Set(["id"]);

export function stripSessionReservedAttributes<A extends object>(attributes: A): A {
	const result = { ...attributes } as Record<string, unknown>;
	for (const key of SESSION_RESERVED_KEYS) {
		delete result[key];
	}
	dropUndefinedValues(result);
	return result as A;
}

export function stripUserReservedAttributes<A extends object>(attributes: A): A {
	const result = { ...attributes } as Record<string, unknown>;
	for (const key of USER_RESERVED_KEYS) {
		delete result[key];
	}
	dropUndefinedValues(result);
	return result as A;
}

function dropUndefinedValues(values: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(values)) {
		if (value === undefined) {
			delete values[key];
		}
	}
}
