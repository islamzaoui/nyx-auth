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
 * Throws unless the session secret hash was stored as a binary column.
 *
 * nyx-auth compares hashes byte-wise, so a `secretHash` stored as TEXT (e.g.
 * base64 or hex) would fail every validation with a confusing error. This
 * check surfaces the schema misconfiguration as a clear {@link AdapterError}
 * instead of silently breaking authentication.
 */
export function assertSecretHash(secretHash: unknown): asserts secretHash is Uint8Array {
	if (!(secretHash instanceof Uint8Array)) {
		const received = secretHash === null ? "null" : typeof secretHash;
		throw new Error(`session secretHash must be stored as a binary column (Uint8Array / Buffer), got ${received}`);
	}
}
