/**
 * The unit of a {@link TimeSpan}.
 */
export type TimeSpanUnit = "ms" | "s" | "m" | "h" | "d" | "w";

const UNIT_TO_MS: Record<TimeSpanUnit, number> = {
	ms: 1,
	s: 1000,
	m: 1000 * 60,
	h: 1000 * 60 * 60,
	d: 1000 * 60 * 60 * 24,
	w: 1000 * 60 * 60 * 24 * 7,
};

/**
 * A length of time expressed as a numeric value and a unit.
 *
 * Used to configure timeouts such as `session.inactivityTimeout` and
 * `session.activityCheckInterval` on {@link NyxOptions}.
 *
 * ### Example
 *
 * ```ts
 * import { TimeSpan } from "@nyx-auth/core";
 *
 * const timeout = new TimeSpan(30, "m");
 * timeout.milliseconds(); // 1_800_000
 * timeout.toDate(); // Date 30 minutes from now
 * ```
 */
export class TimeSpan {
	/**
	 * Creates a time span.
	 *
	 * @param value - The numeric length of the time span.
	 * @param unit - The unit of `value`.
	 * @throws {Error} If `value` is not a finite number.
	 */
	constructor(
		public readonly value: number,
		public readonly unit: TimeSpanUnit
	) {
		if (!Number.isFinite(value)) {
			throw new Error(`TimeSpan: value must be a finite number, got ${value}`);
		}
	}

	/**
	 * Returns the length of the time span in milliseconds.
	 */
	public milliseconds(): number {
		return this.value * UNIT_TO_MS[this.unit];
	}

	/**
	 * Returns the length of the time span in seconds.
	 */
	public seconds(): number {
		return this.milliseconds() / 1000;
	}

	/**
	 * Returns a date this time span ahead of the current time.
	 */
	public toDate(): Date {
		return new Date(Date.now() + this.milliseconds());
	}

	/**
	 * Returns whether `this` time span has elapsed between two dates.
	 *
	 * @param from - The start date.
	 * @param now - The current date.
	 * @returns `true` if `now - from` is at least this time span, `false` otherwise.
	 */
	public elapsedSince(from: Date, now: Date): boolean {
		return now.getTime() - from.getTime() >= this.milliseconds();
	}
}
