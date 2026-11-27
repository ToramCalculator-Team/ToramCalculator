import type { TimeValue } from "~/lib/Reactor/core/time";
import type { HostClock } from "../HostClock";

/**
 * 运行库内部 `Alarm` 的宿主时钟实现。
 *
 * `App` 只在 `_setAlarmOrYield` 里安排等待、在 `_cancelWakeups` 里取消等待，
 * 这里把这两件事转给宿主时钟，运行库的等待因此不再经过真实定时器。
 */
export class HostClockAlarm {
	private handle: number | undefined;

	private _active = false;

	constructor(private readonly clock: HostClock) {}

	/** 是否存在尚未执行的等待。语义与运行库 `Alarm.active` 一致。 */
	public get active(): boolean {
		return this._active;
	}

	/**
	 * 安排一次等待。
	 *
	 * @param task 到期时执行
	 * @param delay 相对当前时刻的延迟
	 */
	public set(task: () => void, delay: TimeValue): void {
		this.unset();
		this._active = true;
		this.handle = this.clock.setTimeout(delay.toMilliseconds(), () => {
			this.handle = undefined;
			this._active = false;
			task();
		});
	}

	/** 取消已安排的等待。 */
	public unset(): void {
		if (this.handle !== undefined) {
			this.clock.clearTimeout(this.handle);
			this.handle = undefined;
		}
		this._active = false;
	}
}
