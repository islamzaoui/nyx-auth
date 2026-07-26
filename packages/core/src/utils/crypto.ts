export function generateSessionId(): string {
	const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);

	let id = "";
	for (const b of bytes) {
		id += alphabet[b >> 3];
	}
	return id;
}

export async function hashSecret(secret: string): Promise<Uint8Array> {
	const secretBytes = new TextEncoder().encode(secret);
	const secretHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
	return new Uint8Array(secretHashBuffer);
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) {
		return false;
	}

	let c = 0;
	const bIterator = b.values();
	for (const aByte of a) {
		const next = bIterator.next();
		if (next.done) {
			return false;
		}
		c |= aByte ^ next.value;
	}

	return c === 0;
}
