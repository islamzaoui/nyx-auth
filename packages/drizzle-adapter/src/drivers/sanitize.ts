const SESSION_RESERVED_KEYS = new Set(["id", "userId", "secretHash", "createdAt", "lastVerifiedAt"]);
const USER_RESERVED_KEYS = new Set(["id"]);

export function stripSessionReservedAttributes<A extends Record<string, any>>(attributes: A | undefined): A {
	const result = { ...(attributes ?? {}) } as Record<string, unknown>;
	for (const key of SESSION_RESERVED_KEYS) {
		delete result[key];
	}
	dropUndefinedValues(result);
	return result as A;
}

export function stripUserReservedAttributes<A extends Record<string, any>>(attributes: A | undefined): A {
	const result = { ...(attributes ?? {}) } as Record<string, unknown>;
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

/**
 * Returns true when the session secret hash was stored as a binary column.
 *
 * nyx-auth compares hashes byte-wise, so a `secretHash` stored as TEXT (e.g.
 * base64 or hex) can never match. Reading such a row fails closed — the
 * session is treated as invalid, so an unauthenticated caller cannot
 * distinguish an existing session with a misconfigured hash column from a
 * missing session.
 */
export function isSecretHash(secretHash: unknown): secretHash is Uint8Array {
	return secretHash instanceof Uint8Array;
}
