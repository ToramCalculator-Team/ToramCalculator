import type { Clock } from "~/lib/Reactor/core/time";

/**
 * 宿主时钟：游戏系统可用的全部时间能力。
 *
 * 读取当前时刻、安排一次唤醒、取消唤醒都经由这个对象；暂停与倍速由宿主时钟自身的状态决定，
 * 游戏系统只感知"时钟走到哪里"和"到点被唤醒"。
 */
export interface HostClock extends Clock {
	/**
	 * 安排一次唤醒。
	 *
	 * 回调由时钟推进时触发，不得在调用内同步执行。
	 *
	 * @param delayMs 相对当前时刻的延迟，单位毫秒
	 * @param callback 到期时调用
	 * @returns 可取消的句柄
	 */
	setTimeout(delayMs: number, callback: () => void): number;

	/**
	 * 取消已安排的唤醒。
	 *
	 * @param handle 唤醒句柄
	 */
	clearTimeout(handle: number): void;
}
