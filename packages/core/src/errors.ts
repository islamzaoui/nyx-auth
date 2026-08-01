/**
 * Error returned by the nyx-auth API when an operation fails unexpectedly.
 *
 * The public methods of `nyx.session.*` and `nyx.user.*` never throw — they
 * return an `UnexpectedError` instead. Check for it with
 * `result instanceof Error` and inspect the original error via
 * {@link Error.cause}.
 */
export class UnexpectedError extends Error {
	override readonly name = "UnexpectedError";
	constructor(cause: unknown) {
		super("An unexpected error occurred", { cause });
	}
}
