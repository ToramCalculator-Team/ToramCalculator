/**
 * Units (and conversion factors from nanoseconds) for time values.
 **/
export enum TimeUnit {
	nsec = 1,
	usec = 1000,
	msec = 1000000,
	sec = 1000000000,
	minute = 60000000000,
	hour = 3600000000000,
	day = 86400000000000,
	week = 604800000000000,
}

/**
 * A time value given in nanosecond precision. To prevent overflow (which would
 * occur for time intervals spanning more than 0.29 years if a single JavaScript
 * number, which has 2^53 bits of precision, were to be used), we use _two_
 * numbers to store a time value. The first number denotes the number of whole
 * seconds in the interval; the second number denotes the remaining number of
 * nanoseconds in the interval. This class serves as a base class for
 * `UnitBasedTimeValue`, which provides the convenience of defining time values
 * as a single number accompanied by a unit.
 * @see TimeUnit
 * @see UnitBasedTimeValue
 */
export class TimeValue {
	/**
	 * Create a new time value. Both parameters must be non-negative integers;
	 * an error will be thrown otherwise. The second parameter is optional.
	 * @param seconds Number of seconds in the interval.
	 * @param nanoseconds Remaining number of nanoseconds (defaults to zero).
	 */
	constructor(
		protected seconds: number,
		protected nanoseconds: number = 0,
	) {
		if (!Number.isInteger(seconds) || !Number.isInteger(nanoseconds) || seconds < 0 || nanoseconds < 0) {
			if (seconds !== Number.MIN_SAFE_INTEGER) {
				throw new Error("Cannot instantiate a time interval based on negative or non-integer numbers.");
			}
		}
	}

	static zero(): TimeValue {
		return new TimeValue(0, 0);
	}

	static never(): TimeValue {
		return new TimeValue(Number.MIN_SAFE_INTEGER, 0);
	}

	static forever(): TimeValue {
		return new TimeValue(Number.MAX_SAFE_INTEGER, 0);
	}

	static secsAndNs(seconds: number, nanoSeconds: number): TimeValue {
		return new TimeValue(seconds, nanoSeconds);
	}

	static secs(seconds: number): TimeValue {
		return TimeValue.secsAndNs(seconds, 0);
	}

	static sec(seconds: number): TimeValue {
		return TimeValue.secsAndNs(seconds, 0);
	}

	static msecs(microseconds: number): TimeValue {
		return TimeValue.withUnits(microseconds, TimeUnit.msec);
	}

	static msec(microseconds: number): TimeValue {
		return TimeValue.withUnits(microseconds, TimeUnit.msec);
	}

	static usecs(nanoseconds: number): TimeValue {
		return TimeValue.withUnits(nanoseconds, TimeUnit.usec);
	}

	static usec(nanoseconds: number): TimeValue {
		return TimeValue.withUnits(nanoseconds, TimeUnit.usec);
	}

	static nsecs(nanoseconds: number): TimeValue {
		return TimeValue.withUnits(nanoseconds, TimeUnit.nsec);
	}

	static nsec(nanoseconds: number): TimeValue {
		return TimeValue.withUnits(nanoseconds, TimeUnit.nsec);
	}

	// FIXME: Add more convenience methods

	/**
	 * Return a new time value that denotes the duration of the time interval
	 * encoded by this time value plus the time interval encoded by the time
	 * value given as a parameter.
	 * @param other The time value to add to this one.
	 */
	add(other: TimeValue): TimeValue {
		if ((this.isNever() && other.isForever()) || (this.isForever() && other.isNever())) {
			// The sum of minus infinity and infinity is zero.
			return TimeValue.zero();
		} else if (this.isNever() || other.isNever()) {
			// The sum of minus infinity and a normal tag is minus infinity.
			return TimeValue.never();
		} else if (this.isForever() || other.isForever()) {
			// The sum of infinity and a normal tag is infinity.
			return TimeValue.forever();
		}
		let seconds = this.seconds + other.seconds;
		let nanoseconds = this.nanoseconds + other.nanoseconds;

		if (nanoseconds >= TimeUnit.sec.valueOf()) {
			// Carry the second.
			seconds += 1;
			nanoseconds -= TimeUnit.sec;
		}

		// Check an overflow.
		if (!Number.isSafeInteger(seconds)) {
			// The overflow happens.
			return TimeValue.forever();
		} else {
			return TimeValue.secsAndNs(seconds, nanoseconds);
		}
	}

	/**
	 * Return a new time value that denotes the duration of the time interval
	 * encoded by this time value minus the time interval encoded by the time
	 * value given as a parameter.
	 * @param other The time value to subtract from this one.
	 */
	subtract(other: TimeValue): TimeValue {
		let s = this.seconds - other.seconds;
		let ns = this.nanoseconds - other.nanoseconds;

		if (ns < 0) {
			// Borrow a second
			s -= 1;
			ns += TimeUnit.sec;
		}

		if (s < 0) {
			throw new Error("Negative time value.");
		}
		return TimeValue.secsAndNs(s, ns);
	}

	multiply(factor: number): TimeValue {
		let seconds = this.seconds * factor;
		let nanoseconds = this.nanoseconds * factor;

		if (nanoseconds >= TimeUnit.sec.valueOf()) {
			// Carry seconds.
			const carry = Math.floor(nanoseconds / TimeUnit.sec);
			seconds += carry;
			nanoseconds -= carry * TimeUnit.sec;
		}
		return TimeValue.secsAndNs(seconds, nanoseconds);
	}

	difference(other: TimeValue): TimeValue {
		if (this.isEarlierThan(other)) {
			return other.subtract(this);
		} else {
			return this.subtract(other);
		}
	}

	/**
	 * Return true if this time value denotes a time interval of equal length as
	 * the interval encoded by the time value given as a parameter.
	 * @param other The time value to compare to this one.
	 */
	isEqualTo(other: TimeValue): boolean {
		return this.seconds === other.seconds && this.nanoseconds === other.nanoseconds;
	}

	/**
	 * Return true if this denotes a time interval of length zero.
	 */
	isZero(): boolean {
		if (this.seconds === 0 && this.nanoseconds === 0) {
			return true;
		} else {
			return false;
		}
	}

	isNever(): boolean {
		if (this.seconds === Number.MIN_SAFE_INTEGER && this.nanoseconds === 0) {
			return true;
		} else {
			return false;
		}
	}

	isForever(): boolean {
		if (this.seconds === Number.MAX_SAFE_INTEGER) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Return true if this time value denotes a time interval of smaller length
	 * than the time interval encoded by the time value given as a parameter;
	 * return false otherwise.
	 *
	 * NOTE: Performing this comparison involves a conversion to a big integer
	 * and is therefore relatively costly.
	 *
	 * @param other The time value to compare to this one.
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt|BigInt} for further information.
	 */
	isEarlierThan(other: TimeValue): boolean {
		if (this.seconds < other.seconds) {
			return true;
		}
		if (this.seconds === other.seconds && this.nanoseconds < other.nanoseconds) {
			return true;
		}
		return false;
	}

	/**
	 * Return true if this time value is later than the time given as a parameter.
	 *
	 * @param other The time value to compare to this one.
	 */
	isLaterThan(other: TimeValue): boolean {
		if (this.seconds > other.seconds) {
			return true;
		}
		if (this.seconds === other.seconds && this.nanoseconds > other.nanoseconds) {
			return true;
		}
		return false;
	}

	/**
	 * Return a millisecond representation of this time value.
	 */
	public toMilliseconds(): number {
		return this.seconds * 1000 + Math.ceil(this.nanoseconds / 1000000);
	}

	/**
	 * Print the number of seconds and nanoseconds in the time interval encoded
	 * by this time value.
	 */
	public toString(): string {
		return `(${this.seconds} secs; ${this.nanoseconds} nsecs)`;
	}

	/**
	 * Return a tuple that holds the seconds and remaining nanoseconds that
	 * jointly represent this time value.
	 */
	public toTimeTuple(): [number, number] {
		return [this.seconds, this.nanoseconds];
	}

	/**
	 * Give a value and time unit, return a new time value.
	 *
	 * The value is a `number` that is required to be
	 * a positive integer. The time unit must be a member of the `TimeUnit` enum.
	 * @param value A number (which must be a positive integer) that denotes
	 * the length of the specified time interval, expressed as a multiple of
	 * the given time unit.
	 * @param unit The unit of measurement that applies to the given value.
	 * @returns
	 */
	public static withUnits(value: number, unit: TimeUnit): TimeValue {
		if (!Number.isInteger(value)) {
			throw new Error("Non-integer time values are illegal.");
		}
		if (value < 0) {
			throw new Error("Negative time values are illegal.");
		}

		const billion = BigInt(TimeUnit.sec);

		// To avoid overflow and floating point errors, work with BigInts.
		const bigT = BigInt(value) * BigInt(unit);
		const bigSeconds = bigT / billion;

		if (bigSeconds > Number.MAX_SAFE_INTEGER) {
			throw new Error("Unable to instantiate time value: value too large.");
		}
		return TimeValue.secsAndNs(Number(bigSeconds), Number(bigT % billion));
	}
}

/**
 * A superdense time instant, represented as a time value `time` (i.e.,
 * time elapsed since Epoch) paired with a microstep index to keep track of
 * iterations in superdense time. For each such iteration, `time` remains
 * the same, but `microstep` is incremented.
 */
export class Tag {
	/**
	 * Time elapsed since Epoch.
	 */
	readonly time: TimeValue;

	/**
	 * Create a new tag using a time value and a microstep.
	 * @param timeSinceEpoch Time elapsed since Epoch.
	 * @param microstep Superdense time index.
	 */
	constructor(
		timeSinceEpoch: TimeValue,
		readonly microstep: number = 0,
	) {
		if (!Number.isInteger(microstep)) {
			throw new Error("Microstep must be integer.");
		}
		if (microstep < 0) {
			throw new Error("Microstep must be positive.");
		}
		this.time = timeSinceEpoch;
	}

	/**
	 * Return `true` if this time instant is earlier than the tag given as a
	 * parameter, false otherwise. For two tags with an equal `time`, one
	 * instant is earlier than the other if its `microstep` is less than the
	 * `microstep` of the other.
	 * @param other The time instant to compare against this one.
	 */
	isSmallerThan(other: Tag): boolean {
		return this.time.isEarlierThan(other.time) || (this.time.isEqualTo(other.time) && this.microstep < other.microstep);
	}

	/**
	 * Return `true` if the tag is smaller than or equal to the tag given as a parameter.
	 * @param other The time instant to compare against this one.
	 */
	isSmallerThanOrEqualTo(other: Tag): boolean {
		return !this.isGreaterThan(other);
	}

	/**
	 * Return `true` if the tag is greater than the tag given as a parameter.
	 * @param other The time instant to compare against this one.
	 */
	isGreaterThan(other: Tag): boolean {
		return this.time.isLaterThan(other.time) || (this.time.isEqualTo(other.time) && this.microstep > other.microstep);
	}

	/**
	 * Return `true` if the tag is greater than or equal to the tag given as a parameter.
	 * @param other The time instant to compare against this one.
	 */
	isGreaterThanOrEqualTo(other: Tag): boolean {
		return !this.isSmallerThan(other);
	}

	/**
	 * Return `true` if this tag is simultaneous with the tag given as
	 * a parameter, false otherwise. Both `time` and `microstep` must be equal
	 * for two tags to be simultaneous.
	 * @param other The time instant to compare against this one.
	 */
	isSimultaneousWith(other: Tag): boolean {
		return this.time.isEqualTo(other.time) && this.microstep === other.microstep;
	}

	/**
	 * Get a new time instant that represents this time instant plus
	 * the given delay. The `microstep` of this time instant is ignored;
	 * the returned time instant has a `microstep` of zero if the delay
	 * is greater than zero. If the delay equals zero or is undefined,
	 * the tag is returned unchanged with its current `microstep`.
	 * @param delay The time interval to add to this time instant.
	 */
	getLaterTag(delay: TimeValue | undefined): Tag {
		if (delay === undefined) {
			return this;
		} else if (delay.isZero()) {
			return new Tag(this.time, this.microstep + 1);
		} else {
			return new Tag(delay.add(this.time), 0);
		}
	}

	/**
	 * Get a new time instant that has the same `time` but n `microsteps` later.
	 */
	getMicroStepsLater(n: number): Tag {
		return new Tag(this.time, this.microstep + n);
	}

	/**
	 * Obtain a time interval that represents the absolute (i.e., positive) time
	 * difference between this time interval and the tag given as a parameter.
	 * @param other The time instant for which to compute the absolute
	 * difference with this time instant.
	 */
	getTimeDifference(other: Tag): TimeValue {
		if (this.isSmallerThan(other)) {
			return other.time.subtract(this.time);
		} else {
			return this.time.subtract(other.time);
		}
	}

	/**
	 * Return a human-readable string presentation of this time instant.
	 */
	public toString(): string {
		return `(${this.time.toString()}, ${this.microstep})`;
	}


}

/**
 * A descriptor to be used when scheduling events to denote as to whether
 * an event should occur with a delay relative to _physical time_ or _logical
 * time_.
 */
export enum Origin {
	physical = "physical",
	logical = "logical",
}

/**
 * 当前物理时间的单调毫秒值，仅用于测量已经过的时间。
 */
function nowMonotonicMs(): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * 当前物理时间的 epoch 毫秒值。浏览器和 Node 都提供 performance；
 * performance.timeOrigin 给出本次运行的 epoch 基准。
 */
function nowEpochMs(): number {
	if (typeof performance !== "undefined") {
		const origin = Number.isFinite(performance.timeOrigin) ? performance.timeOrigin : Date.now() - performance.now();
		return origin + performance.now();
	}
	return Date.now();
}

/**
 * 物理时间源。运行时只通过这个接口读取物理时间，测试和回放可以注入固定时钟。
 */
export interface Clock {
	now(): TimeValue;
}

function readSystemTime(): TimeValue {
	const t = nowEpochMs();
	const seconds = Math.floor(t / 1000);
	let nanoseconds = Math.round((t - seconds * 1000) * 1_000_000);

	if (nanoseconds >= TimeUnit.sec) {
		return TimeValue.secsAndNs(seconds + 1, nanoseconds - TimeUnit.sec);
	}
	return TimeValue.secsAndNs(seconds, nanoseconds);
}

const systemClock: Clock = { now: readSystemTime };
let activeClock: Clock = systemClock;

/**
 * Return a time value that reflects the current physical time as reported
 * by the platform, or by the injected Clock.
 */
export function getCurrentPhysicalTime(): TimeValue {
	return activeClock.now();
}

/** 替换物理时间源；传入固定时钟即可做确定性测试。 */
export function setClock(clock: Clock): void {
	activeClock = clock;
}

/** 恢复系统时钟。 */
export function resetClock(): void {
	activeClock = systemClock;
}

/**
 * Alarm 只依赖 performance 与 setTimeout，可在浏览器和 Node 中运行。
 * 逻辑语义保持不变：到期执行 task；未到期时最多每 25ms 轮询一次。
 */
export class Alarm {
	private timer: ReturnType<typeof setTimeout> | undefined;
	private startMs = 0;
	private delayMs = 0;

	/** 是否已经设置了一个尚未执行的 alarm。 */
	active = false;

	/** 取消当前 alarm。 */
	unset(): void {
		if (this.timer !== undefined) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
		this.active = false;
	}

	private try(task: () => void, callback?: (waitTime: TimeValue) => void): void {
		const elapsed = nowMonotonicMs() - this.startMs;

		if (elapsed >= this.delayMs) {
			this.timer = setTimeout(() => {
				this.timer = undefined;
				if (!this.active) return;
				this.active = false;
				task();
				callback?.(TimeValue.msecs(Math.max(0, Math.round(elapsed))));
			}, 0);
			return;
		}

		const wait = Math.min(this.delayMs - elapsed, 25);
		this.timer = setTimeout(() => this.try(task, callback), wait);
		this.active = true;
	}

	/**
	 * Set the alarm.
	 * @param task The task to be performed.
	 * @param delay The time has to elapse before the task can be performed.
	 * @param callback Optional callback used to report the wait time.
	 */
	public set(task: () => void, delay: TimeValue, callback?: (waitTime: TimeValue) => void): void {
		if (this.active) this.unset();
		this.delayMs = delay.toMilliseconds();
		this.startMs = nowMonotonicMs();
		this.active = true;
		this.try(task, callback);
	}
}
