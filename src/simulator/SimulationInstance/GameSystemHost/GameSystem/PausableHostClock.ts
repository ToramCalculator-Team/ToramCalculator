import type { TimeValue } from "~/lib/Reactor/core/time";
import { TimeValue as TimeValueClass } from "~/lib/Reactor/core/time";
import type { HostClock } from "./HostClock";

/**
 * 真实时间源：时钟需要的全部平台能力。
 *
 * 测试注入手动实现后，真实时间、定时器与立即任务都完全可控。
 */
export interface RealTimeSource {
	/** 单调递增的真实毫秒。 */
	nowMs(): number;

	/** 在真实时间延迟后调用回调。 */
	setTimeout(delayMs: number, callback: () => void): unknown;

	/** 取消真实定时器。 */
	clearTimeout(handle: unknown): void;

	/** 安排一个不经过 HTML 定时器钳制的立即任务。 */
	scheduleImmediate(callback: () => void): unknown;

	/** 取消尚未执行的立即任务。 */
	cancelImmediate(handle: unknown): void;
}

interface ImmediateScheduler {
	schedule(callback: () => void): unknown;
	cancel(handle: unknown): void;
}

/**
 * 平台立即任务实现。
 *
 * `MessageChannel` 的任务不受 HTML 定时器"嵌套 5 层后至少 4ms"的限制，
 * 用于立即唤醒；平台没有 MessageChannel 时退回 `setTimeout(0)`。
 */
function createImmediateScheduler(): ImmediateScheduler {
	if (typeof MessageChannel === "undefined") {
		return {
			schedule: (callback) => globalThis.setTimeout(callback, 0),
			cancel: (handle) => {
				globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>);
			},
		};
	}

	const channel = new MessageChannel();
	const queue: { token: object; callback: () => void }[] = [];
	let scheduled = false;

	const pump = (): void => {
		if (scheduled) {
			return;
		}
		scheduled = true;
		channel.port2.postMessage(0);
	};

	channel.port1.onmessage = () => {
		scheduled = false;
		const next = queue.shift();
		if (next !== undefined) {
			next.callback();
		}
		if (queue.length > 0) {
			pump();
		}
	};

	return {
		schedule(callback) {
			const token = {};
			queue.push({ token, callback });
			pump();
			return token;
		},
		cancel(handle) {
			const index = queue.findIndex((item) => item.token === handle);
			if (index >= 0) {
				queue.splice(index, 1);
			}
		},
	};
}

const systemImmediateScheduler = createImmediateScheduler();

/** 平台默认的真实时间源。 */
export const systemRealTimeSource: RealTimeSource = {
	nowMs: () => performance.now(),
	setTimeout: (delayMs, callback) => globalThis.setTimeout(callback, delayMs),
	clearTimeout: (handle) => {
		globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>);
	},
	scheduleImmediate: (callback) => systemImmediateScheduler.schedule(callback),
	cancelImmediate: (handle) => systemImmediateScheduler.cancel(handle),
};

export interface PausableHostClockOptions {
	/** 真实时间源；默认使用平台时钟。 */
	realTime?: RealTimeSource;

	/** 初始虚拟时刻，毫秒；默认 0。 */
	startTimeMs?: number;

	/** 时间倍率（虚拟时间增量 / 真实时间增量）；默认 1。 */
	rate?: number;
}

interface VirtualWakeup {
	id: number;
	/** 虚拟时刻，整数毫秒。 */
	dueMs: number;
	callback: () => void;
}

interface DeliveryHandle {
	kind: "timer" | "immediate";
	handle: unknown;
}

/**
 * 宿主时钟。
 *
 * 时间值是解析式：运行中 `now = 锚点 + (真实经过时间) × 倍率`，暂停时停在锚点。
 * 时钟不按周期 tick，也不依赖游戏系统的任何事件；只有存在等待者时，才挂一个真实
 * 定时器把到期唤醒投递出去。没有等待者时时钟仍然"自顾自前进"，只是不需要唤醒任何人。
 */
export class PausableHostClock implements HostClock {
	/** 当前时间倍率。 */
	public get timeScale(): number {
		return this.rate;
	}

	/** 时钟是否在前进。 */
	public get isRunning(): boolean {
		return this.running;
	}

	private readonly realTime: RealTimeSource;

	private readonly waiters = new Map<number, VirtualWakeup>();

	private nextId = 1;

	/** 时间值锚点：运行中按真实经过时间与倍率从这里外推。 */
	private anchorVirtualMs: number;

	private anchorRealMs: number;

	private rate: number;

	private running = false;

	private delivery: DeliveryHandle | undefined;

	/** 正在投递到期唤醒；期间回调新安排的唤醒由本轮投递结束后统一重排。 */
	private draining = false;

	private disposed = false;

	constructor(options: PausableHostClockOptions = {}) {
		this.realTime = options.realTime ?? systemRealTimeSource;
		this.anchorVirtualMs = Math.max(0, Math.round(options.startTimeMs ?? 0));
		this.anchorRealMs = this.realTime.nowMs();
		this.rate = normalizeRate(options.rate ?? 1);
	}

	now(): TimeValue {
		return TimeValueClass.msecs(this.nowMs());
	}

	nowMs(): number {
		return Math.floor(this.rawVirtualMs());
	}

	/** 尚未触发的唤醒数。 */
	pendingWakeups(): number {
		return this.waiters.size;
	}

	setTimeout(delayMs: number, callback: () => void): number {
		if (this.disposed) {
			throw new Error("宿主时钟已销毁。");
		}
		const id = this.nextId;
		this.nextId += 1;
		this.waiters.set(id, {
			id,
			dueMs: this.nowMs() + Math.max(0, Math.round(delayMs)),
			callback,
		});
		this.armDelivery();
		return id;
	}

	clearTimeout(handle: number): void {
		if (!this.waiters.delete(handle)) {
			return;
		}
		this.armDelivery();
	}

	/** 启动时钟前进。已在运行时不做事。 */
	start(): void {
		this.resume();
	}

	/** 恢复时钟前进。 */
	resume(): void {
		if (this.disposed) {
			throw new Error("宿主时钟已销毁。");
		}
		if (this.running) {
			return;
		}
		this.anchorRealMs = this.realTime.nowMs();
		this.running = true;
		this.armDelivery();
	}

	/** 暂停：时间停在当前值；未到期的唤醒保留，恢复后按剩余虚拟时间继续。 */
	pause(): void {
		if (!this.running) {
			return;
		}
		const realNow = this.realTime.nowMs();
		this.fold(realNow);
		this.anchorRealMs = realNow;
		this.running = false;
		this.cancelDelivery();
	}

	/**
	 * 设置时间倍率。
	 *
	 * 从调用时刻起生效；运行中切换时先按旧倍率结算，再按新倍率重排待唤醒的等待时长。
	 */
	setTimeScale(rate: number): void {
		const next = normalizeRate(rate);
		if (!this.running) {
			this.rate = next;
			return;
		}
		const realNow = this.realTime.nowMs();
		this.fold(realNow);
		this.anchorRealMs = realNow;
		this.rate = next;
		this.armDelivery();
	}

	/**
	 * 把虚拟时刻拨到指定时刻。
	 *
	 * 只在暂停时可用；拨动后触发所有已经到期的唤醒。
	 */
	advanceTo(timeMs: number): void {
		if (this.running) {
			throw new Error("时钟运行中不能拨钟；先暂停。");
		}
		const target = Math.round(timeMs);
		if (target < this.nowMs()) {
			throw new Error("不能把时钟拨回过去。");
		}
		this.anchorVirtualMs = target;
		this.anchorRealMs = this.realTime.nowMs();
		while (this.earliestDueMs() <= this.nowMs()) {
			this.fireDue();
		}
	}

	/** 销毁时钟：停止前进并丢弃唤醒队列。 */
	dispose(): void {
		if (this.disposed) {
			return;
		}
		this.cancelDelivery();
		this.disposed = true;
		this.waiters.clear();
	}

	/** 运行中把真实经过时间折算进锚点；暂停时不做任何事。 */
	private fold(realNow: number): void {
		if (!this.running) {
			return;
		}
		this.anchorVirtualMs += (realNow - this.anchorRealMs) * this.rate;
	}

	private rawVirtualMs(): number {
		if (!this.running) {
			return this.anchorVirtualMs;
		}
		return this.anchorVirtualMs + (this.realTime.nowMs() - this.anchorRealMs) * this.rate;
	}

	/**
	 * 重排投递。
	 *
	 * 没有等待者或时钟暂停时不挂任何真实定时器；最早到期者在当前虚拟时刻之前时
	 * 用立即任务投递，否则按 `剩余虚拟时间 / 倍率` 挂一个真实定时器。
	 */
	private armDelivery(): void {
		if (this.draining) {
			return;
		}
		this.cancelDelivery();
		if (!this.running || this.disposed) {
			return;
		}
		const next = this.earliestWakeup();
		if (next === undefined) {
			return;
		}
		const nowMs = this.nowMs();
		if (next.dueMs <= nowMs) {
			this.delivery = {
				kind: "immediate",
				handle: this.realTime.scheduleImmediate(() => this.deliver()),
			};
			return;
		}
		const waitRealMs = (next.dueMs - this.rawVirtualMs()) / this.rate;
		const delayMs = Math.max(1, Math.ceil(waitRealMs));
		this.delivery = {
			kind: "timer",
			handle: this.realTime.setTimeout(delayMs, () => this.deliver()),
		};
	}

	private deliver(): void {
		this.delivery = undefined;
		if (!this.running || this.disposed) {
			return;
		}
		this.fireDue();
		this.armDelivery();
	}

	/**
	 * 投递当前已经到期的一批唤醒。
	 *
	 * 只处理调用开始时已经到期的唤醒；回调中新安排的立即唤醒留到下一个任务，
	 * 避免把整条 catch-up 链压进同一个长任务。
	 */
	private fireDue(): void {
		this.draining = true;
		const horizon = this.nowMs();
		const due = [...this.waiters.values()]
			.filter((wakeup) => wakeup.dueMs <= horizon)
			.sort((left, right) => left.dueMs - right.dueMs || left.id - right.id);
		for (const wakeup of due) {
			if (!this.waiters.delete(wakeup.id)) {
				continue;
			}
			wakeup.callback();
		}
		this.draining = false;
	}

	private earliestWakeup(): VirtualWakeup | undefined {
		let next: VirtualWakeup | undefined;
		for (const wakeup of this.waiters.values()) {
			if (next === undefined || wakeup.dueMs < next.dueMs) {
				next = wakeup;
			}
		}
		return next;
	}

	private earliestDueMs(): number {
		return this.earliestWakeup()?.dueMs ?? Number.POSITIVE_INFINITY;
	}

	private cancelDelivery(): void {
		if (this.delivery === undefined) {
			return;
		}
		if (this.delivery.kind === "timer") {
			this.realTime.clearTimeout(this.delivery.handle);
		} else {
			this.realTime.cancelImmediate(this.delivery.handle);
		}
		this.delivery = undefined;
	}
}

function normalizeRate(rate: number): number {
	if (!(rate > 0) || !Number.isFinite(rate)) {
		throw new Error("时间倍率必须是大于 0 的有限数。");
	}
	return rate;
}
