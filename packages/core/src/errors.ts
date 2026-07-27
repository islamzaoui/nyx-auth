export class UnexpectedError extends Error {
	override readonly name = "UnexpectedError";
	constructor(cause: unknown) {
		super("An unexpected error occurred", { cause });
	}
}
