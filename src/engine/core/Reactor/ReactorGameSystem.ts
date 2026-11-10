import { App, type AppCheckpoint, type AppCheckpointEvent, type Reactor } from "~/lib/Reactor/core/reactor";
import { Tag, TimeValue } from "~/lib/Reactor/core/time";
import type { CollectorStats, GameSystem, GameSystemCheckpoint, SimulationTime } from "../GameSystem";

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

/**
 * GameSystem 的 Reactor 实现。
 *
 * 继承 `App`，运行控制与检查点各对应一个受保护方法，不在这里重新实现调度：
 * 单步、暂停、恢复、捕获与恢复都由 `App` 承担。
 *
 * 子类在 `initialize()` 里建立网络、输入采样器与采集器。
 */
export abstract class ReactorGameSystem extends App implements GameSystem {
	/** 网络根。 */
	protected root!: Reactor;

	/** 逻辑时间完成观察者。 */
	private readonly advanceListeners = new Set<(time: SimulationTime) => void>();

	/** 采集器集合。 */
	private readonly collectors: { name: string; getStats(): CollectorStats }[] = [];

	/**
	 * 建立网络、输入采样器与采集器。
	 *
	 * 由宿主在加载时调用一次。
	 */
	public abstract initialize(): void;

	public start(): void {
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
