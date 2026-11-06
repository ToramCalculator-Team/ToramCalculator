import type { Tag } from "./types";

/**
 * LogicalAction：Reactor 内的延迟触发通道。
 *
 * 对应 LF 的 `logical action`。通过 Reactor.schedule() 投递消息，
 * ReactorScheduler 在目标 Tag 时将值分发到此 Action，触发声明了它为 trigger 的 Reaction。
 *
 * delay=0 时事件在 (currentLogicalTime, currentMicrostep+1) 触发（超稠密时间语义）。
 */
export class LogicalAction<T = undefined> {
	readonly name: string;
	private _pending: T | undefined = undefined;
	private _present = false;

	constructor(name: string) {
		this.name = name;
	}

	/** 当前 Tag 是否收到投递。 */
	get isPresent(): boolean {
		return this._present;
	}

	/** 当前投递的值。仅在 isPresent 为 true 时有意义。 */
	get value(): T | undefined {
		return this._pending;
	}

	/** @internal 由 ReactorScheduler 在 Tag 开始时分发到期消息时调用。 */
	_deliver(value: T): void {
		this._pending = value;
		this._present = true;
	}

	/** @internal 由 ReactorScheduler 在 Tag 结束时调用。 */
	_clear(): void {
		this._pending = undefined;
		this._present = false;
	}
}

/**
 * PhysicalAction：从异步上下文（外部 IO、用户输入）调度的触发通道。
 *
 * 对应 LF 的 `physical action`。tag 由物理时钟在调度时赋值（不确定性边界）；
 * 一旦 tag 确定，后续处理完全确定。
 * 物理 Action 是"确定性程序与外部世界之间的边界"。
 *
 * 在引擎中：输入端口快照（每 tick 读一次）是 Physical Action 的等价实现，
 * 因此此类主要用于将来扩展直接异步输入场景。
 */
export class PhysicalAction<T = undefined> {
	readonly name: string;
	private _pending: T | undefined = undefined;
	private _present = false;

	/** 本次事件被赋予的 tag（由调度器在物理时间读取时确定）。 */
	_tag: Tag | undefined = undefined;

	constructor(name: string) {
		this.name = name;
	}

	get isPresent(): boolean {
		return this._present;
	}

	get value(): T | undefined {
		return this._pending;
	}

	/** @internal 由 ReactorScheduler 分发时调用。 */
	_deliver(value: T, tag: Tag): void {
		this._pending = value;
		this._present = true;
		this._tag = tag;
	}

	/** @internal */
	_clear(): void {
		this._pending = undefined;
		this._present = false;
		this._tag = undefined;
	}
}
