export type TimeSpanUnit = "ms" | "s" | "m" | "h" | "d" | "w";

const UNIT_TO_MS: Record<TimeSpanUnit, number> = {
	ms: 1,
	s: 1000,
	m: 1000 * 60,
	h: 1000 * 60 * 60,
	d: 1000 * 60 * 60 * 24,
	w: 1000 * 60 * 60 * 24 * 7,
};

export class TimeSpan {
	constructor(
		public readonly value: number,
		public readonly unit: TimeSpanUnit
	) {
		if (!Number.isFinite(value)) {
			throw new Error(`TimeSpan: value must be a finite number, got ${value}`);
		}
	}

	public milliseconds(): number {
		return this.value * UNIT_TO_MS[this.unit];
	}

	public seconds(): number {
		return this.milliseconds() / 1000;
	}

	public toDate(): Date {
		return new Date(Date.now() + this.milliseconds());
	}

	public elapsedSince(from: Date, now: Date): boolean {
		return now.getTime() - from.getTime() >= this.milliseconds();
	}
}
