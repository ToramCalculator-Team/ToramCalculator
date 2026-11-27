import { App, type AppCheckpoint, type AppCheckpointEvent, type Reactor } from "~/lib/Reactor/core/reactor";
import { resetClock, setClock, Tag, TimeValue } from "~/lib/Reactor/core/time";
import type { CollectorStats, GameSystem, GameSystemCheckpoint, SimulationTime } from "../GameSystem";
import type { HostClock } from "../HostClock";
import { HostClockAlarm } from "./HostClockAlarm";

/**
 * 检查点的 payload。
 *
 * 时间是秒与纳秒，事件里的 trigger 是全限定名，因此整份 payload 只含可序列化的原始值。
 */
interface ReactorCheckpointPayload {
	startSeconds: number;
	startNanoseconds: number;
	tagSeconds: number;
	tagNanoseconds: number;
	microstep: number;
	pendingEvents: {
		triggerName: string;
		tagSeconds: number;
		tagNanoseconds: number;
		microstep: number;
		value: unknown;
	}[];
}

/** 当前线程安装宿主时钟的系统。宿主时钟是进程内唯一的物理时间源，同一时刻只能有一个系统持有。 */
let clockOwner: ReactorGameSystem | undefined;

/**
 * GameSystem 的 Reactor 实现。
 *
 * 继承 `App`，运行控制与检查点各对应一个受保护方法，不在这里重新实现调度：
 * 单步、暂停、恢复、捕获与恢复都由 `App` 承担。
 *
 * 构造时安装宿主时钟：物理时间源与等待源都换成宿主时钟，运行库的调度仍由 `App` 自己驱动。
 * 子类在 `initialize()` 里建立网络、输入采样器与采集器。
 */
export abstract class ReactorGameSystem extends App implements GameSystem {
	/** 网络根。 */
	protected root!: Reactor;

	/** 宿主时钟：物理时间源与唤醒源。 */
	protected readonly clock: HostClock;

	/** 逻辑时间完成观察者。 */
	private readonly advanceListeners = new Set<(time: SimulationTime) => void>();

	/** 采集器集合。 */
	private readonly collectors: { name: string; getStats(): CollectorStats }[] = [];

	/** 立即唤醒的句柄；App 内部同一职责字段是私有的，这里单独维护。 */
	private immediateHandle: number | undefined;

	private disposed = false;

	/**
	 * @param clock 宿主时钟
	 * @param executionTimeout 运行超时；不提供时不自动结束
	 * @param keepAlive 队列空时是否保持运行
	 * @param fast 是否跳过物理时间等待
	 */
	constructor(clock: HostClock, executionTimeout?: TimeValue, keepAlive = false, fast = false) {
		super(executionTimeout, keepAlive, fast);
		if (clockOwner !== undefined && !clockOwner.disposed) {
			throw new Error("同一线程只允许一个活动的 ReactorGameSystem：宿主时钟是唯一物理时间源。");
		}
		this.clock = clock;
		clockOwner = this;

		// 物理时间源：App 的时间门、起始时刻、物理 Origin 与截止期都读它。
		setClock(clock);

		// 唤醒源：App 的等待改由宿主时钟安排与取消，运行库内不再使用真实定时器。
		(this as unknown as { _alarm: HostClockAlarm })._alarm = new HostClockAlarm(clock);
	}

	/**
	 * 建立网络、输入采样器与采集器。
	 *
	 * 由宿主在加载时调用一次。
	 */
	public abstract initialize(): void;

	public start(): void {
		if (this.disposed) {
			throw new Error("ReactorGameSystem 已销毁，不能再次启动。");
		}
		this._start();
	}

	public stop(): void {
		this._shutdown();
	}

	public pause(): void {
		this._pauseScheduling();
	}

	public resume(): void {
		this._resumeScheduling();
	}

	public stepToNext(): SimulationTime | null {
		if (this._peekNextTag() == null) {
			return null;
		}
		return this.toSimulationTime(this._stepToNextTag());
	}

	public getTime(): SimulationTime {
		return this.toSimulationTime(this._getCurrentTag());
	}

	public getNextTime(): SimulationTime | null {
		const tag = this._peekNextTag();
		return tag === undefined ? null : this.toSimulationTime(tag);
	}

	public onAdvance(listener: (time: SimulationTime) => void): () => void {
		this.advanceListeners.add(listener);
		return () => {
			this.advanceListeners.delete(listener);
		};
	}

	public captureCheckpoint(): GameSystemCheckpoint {
		const checkpoint = this._captureCheckpoint();
		return {
			time: this.toSimulationTime(checkpoint.tag),
			payload: this.encode(checkpoint),
		};
	}

	public restoreCheckpoint(checkpoint: GameSystemCheckpoint): void {
		this._restoreCheckpoint(this.decode(checkpoint));
	}

	public getCollectorStats(): CollectorStats[] {
		return this.collectors.map((collector) => collector.getStats());
	}

	/** 取消全部唤醒并恢复系统时钟；销毁后实例不再接受启动。 */
	public dispose(): void {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this._alarm.unset();
		this.cancelImmediate();
		if (clockOwner === this) {
			clockOwner = undefined;
			resetClock();
		}
	}

	/**
	 * 逻辑时间完成。
	 *
	 * `App` 只在当前逻辑时间没有后续微步时调用这里。
	 */
	protected override _tagComplete(tag: Tag): void {
		super._tagComplete(tag);
		if (this.advanceListeners.size === 0) {
			return;
		}
		const time = this.toSimulationTime(tag);
		for (const listener of this.advanceListeners) {
			listener(time);
		}
	}

	/**
	 * 取消唤醒。
	 *
	 * `App` 取消等待与运行时收尾都走这里；立即唤醒由本类维护，必须一并取消。
	 */
	protected override _cancelWakeups(): void {
		super._cancelWakeups();
		this.cancelImmediate();
	}

	protected override _cancelNext(): void {
		super._cancelNext();
		this.cancelImmediate();
	}

	/**
	 * 立即唤醒。
	 *
	 * `App` 在物理时间已越过下一项工作时调用这里，用于排空积压的逻辑时刻。
	 * 运行库原实现使用真实定时器；这里改由宿主时钟安排，保证暂停时钟即可停住系统。
	 */
	protected override _requestImmediateInvocationOfNext(): void {
		if (this._sleepSuspended || this.immediateHandle !== undefined) {
			return;
		}
		this.immediateHandle = this.clock.setTimeout(0, () => {
			this.immediateHandle = undefined;
			this.stepToNext();
		});
	}

	private cancelImmediate(): void {
		if (this.immediateHandle !== undefined) {
			this.clock.clearTimeout(this.immediateHandle);
			this.immediateHandle = undefined;
		}
	}

	/**
	 * 标签与 `SimulationTime` 的互转。
	 *
	 * `cursor` 放微步：引擎按 `timeMs` 排序，需要精确定位时用 `cursor`。
	 */
	protected toSimulationTime(tag: Tag): SimulationTime {
		return { timeMs: tag.time.toMilliseconds(), cursor: tag.microstep };
	}

	private encode(checkpoint: AppCheckpoint): ReactorCheckpointPayload {
		const [startSeconds, startNanoseconds] = checkpoint.startTime.toTimeTuple();
		const [tagSeconds, tagNanoseconds] = checkpoint.tag.time.toTimeTuple();
		return {
			startSeconds,
			startNanoseconds,
			tagSeconds,
			tagNanoseconds,
			microstep: checkpoint.tag.microstep,
			pendingEvents: checkpoint.pendingEvents.map((event) => {
				const [seconds, nanoseconds] = event.tag.time.toTimeTuple();
				return {
					triggerName: event.triggerName,
					tagSeconds: seconds,
					tagNanoseconds: nanoseconds,
					microstep: event.tag.microstep,
					value: event.value,
				};
			}),
		};
	}

	private decode(checkpoint: GameSystemCheckpoint): AppCheckpoint {
		const payload = checkpoint.payload as ReactorCheckpointPayload;
		const pendingEvents: AppCheckpointEvent[] = payload.pendingEvents.map((event) => ({
			triggerName: event.triggerName,
			tag: new Tag(TimeValue.secsAndNs(event.tagSeconds, event.tagNanoseconds), event.microstep),
			value: event.value,
		}));
		return {
			startTime: TimeValue.secsAndNs(payload.startSeconds, payload.startNanoseconds),
			tag: new Tag(TimeValue.secsAndNs(payload.tagSeconds, payload.tagNanoseconds), payload.microstep),
			pendingEvents,
		};
	}
}
