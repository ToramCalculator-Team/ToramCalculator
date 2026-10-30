import type { ZodType } from "zod";
import { InputPort } from "./InputPort";
import { LogicalAction, PhysicalAction } from "./LogicalAction";
import { OutputPort } from "./OutputPort";
import type { PortConnection, ReactionDecl, ReactorContext, Tag } from "./types";
import { nextMicrostep } from "./types";

export { nextMicrostep };
export type { PortConnection, ReactorContext, Tag };

/**
 * Reactor 抽象基类（标准 LF 实现）。
 *
 * 三个 Actor 原语：
 * - create → 在 reaction 体内动态创建并注册新 Reactor（对应 LF mutations）
 * - send   → 向目标 Reactor 的 LogicalAction 投递延迟消息，按超稠密时间有序交付
 * - become → 切换当前激活的 Mode（LF Modal Reactors），下一 Tag 起生效
 *
 * 端口通过 addInput/addOutput 声明时传入 ZodType，提供编译期类型安全和运行期契约。
 * 调度器只读取 Reaction 的 triggers/uses/effects/mode 构造 APG，不执行 body。
 */
export abstract class Reactor {
	readonly id: string;

	/** @internal 供 ReactorScheduler 访问。 */
	readonly inputPorts = new Map<string, InputPort<unknown>>();
	/** @internal 供 ReactorScheduler 访问。 */
	readonly outputPorts = new Map<string, OutputPort<unknown>>();
	/** @internal 供 ReactorScheduler 访问。 */
	readonly logicalActions = new Map<string, LogicalAction<unknown>>();
	/** @internal 供 ReactorScheduler 访问。 */
	readonly physicalActions = new Map<string, PhysicalAction<unknown>>();

	private context: ReactorContext | null = null;

	// ── Modal Reactors（become 原语）─────────────────────────

	/**
	 * 当前激活的 Mode 名（LF Modal Reactors 语义）。
	 * undefined 表示无 Mode（所有未绑定 mode 的 Reaction 均激活）。
	 * become() 在本 Tag 调用，下一 Tag 起生效。
	 */
	private _currentMode: string | undefined = undefined;
	/** @internal 调度器在 Tag 开始时读取此快照。 */
	_modeSnapshot: string | undefined = undefined;

	constructor(id: string) {
		this.id = id;
	}

	/** @internal 由 ReactorScheduler.register() 注入。 */
	_bind(context: ReactorContext): void {
		this.context = context;
	}

	// ── 端口与 Action 声明辅助（子类构造时调用）──────────────

	/**
	 * 声明输入端口。schema 提供运行期值验证与编辑器可发现性。
	 *
	 * @example
	 * readonly damage = this.addInput("damage", z.number().nonnegative());
	 */
	protected addInput<T>(name: string, schema: ZodType<T>): InputPort<T> {
		const port = new InputPort<T>(name, schema);
		this.inputPorts.set(name, port as InputPort<unknown>);
		return port;
	}

	/**
	 * 声明输出端口。schema 提供运行期值验证与编辑器可发现性。
	 *
	 * @example
	 * readonly hp = this.addOutput("hp", z.number().nonnegative());
	 */
	protected addOutput<T>(name: string, schema: ZodType<T>): OutputPort<T> {
		const port = new OutputPort<T>(name, schema);
		this.outputPorts.set(name, port as OutputPort<unknown>);
		return port;
	}

	protected addLogicalAction<T = undefined>(name: string): LogicalAction<T> {
		const action = new LogicalAction<T>(name);
		this.logicalActions.set(name, action as LogicalAction<unknown>);
		return action;
	}

	protected addPhysicalAction<T = undefined>(name: string): PhysicalAction<T> {
		const action = new PhysicalAction<T>(name);
		this.physicalActions.set(name, action as PhysicalAction<unknown>);
		return action;
	}

	// ── Actor 三原语（一等公民）──────────────────────────────

	/**
	 * create：动态创建并注册子 Reactor（Actor create 原语）。
	 * 新 Reactor 从下一 Tag 起参与调度（APG 标记脏）。
	 */
	create<R extends Reactor>(
		cls: new (id: string, ...args: unknown[]) => R,
		id: string,
		connections?: PortConnection[],
		...args: unknown[]
	): R {
		const instance = new cls(id, ...args);
		this.context?.register(instance, connections);
		return instance;
	}

	/**
	 * send：向目标 Reactor 的 LogicalAction 投递延迟消息（Actor send 原语）。
	 *
	 * delayNs=0n → 事件在 (currentLogicalTime, currentMicrostep+1) 触发。
	 * delayNs>0n → 事件在 (currentLogicalTime + delayNs, 0) 触发。
	 */
	send<T>(targetReactorId: string, actionName: string, value: T, delayNs: bigint = 0n): void {
		const now = this.context?.currentTag();
		if (!now) return;
		const executeAt = delayNs === 0n ? nextMicrostep(now) : { logicalTime: now.logicalTime + delayNs, microstep: 0 };
		this.context?.enqueue({
			id: `${this.id}->${targetReactorId}.${actionName}@${executeAt.logicalTime}+${executeAt.microstep}-${Math.random().toString(36).slice(2)}`,
			targetReactorId,
			actionName,
			value,
			executeAt,
		});
	}

	/**
	 * become：切换当前激活的 Mode（Actor become 原语，LF Modal Reactors）。
	 *
	 * 下一 Tag 起生效；当前 Tag 的 APG 已由快照确定，不受影响。
	 * 只有声明了目标 mode（或未绑定 mode）的 Reaction 会在切换后被触发。
	 */
	become(mode: string | undefined): void {
		this._currentMode = mode;
	}

	// ── 子类实现 ──────────────────────────────────────────────

	/**
	 * 返回该 Reactor 所有 Reaction 的静态声明。
	 * 调度器只读取元数据构造 APG，不执行 body。此方法不应有副作用。
	 */
	abstract reactions(): ReactionDecl<this>[];

	// ── 调度器内部接口 ────────────────────────────────────────

	/** @internal 调度器在 Tag 开始时调用，固化本 Tag 的 Mode 快照。 */
	_snapshotMode(): void {
		this._modeSnapshot = this._currentMode;
	}

	/**
	 * @internal 返回本 Tag 内被触发且与当前 Mode 匹配的 Reaction 列表。
	 * 同 Reactor 内多 Reaction 按声明顺序执行（LF 全序规则）。
	 */
	_getTriggeredReactions(): ReactionDecl<this>[] {
		return this.reactions().filter((r) => {
			if (r.mode !== undefined && r.mode !== this._modeSnapshot) return false;
			return r.triggers.some((name) => {
				const port = this.inputPorts.get(name);
				if (port) return port.isPresent;
				const logical = this.logicalActions.get(name);
				if (logical) return logical.isPresent;
				const physical = this.physicalActions.get(name);
				return physical?.isPresent ?? false;
			});
		});
	}

	/** @internal 由 ReactorScheduler 在 Tag 结束时调用。 */
	_clearPorts(): void {
		for (const port of this.inputPorts.values()) port._clear();
		for (const port of this.outputPorts.values()) port._clear();
		for (const action of this.logicalActions.values()) action._clear();
		for (const action of this.physicalActions.values()) action._clear();
	}

	// ── Checkpoint ────────────────────────────────────────────

	abstract captureState(): unknown;
	abstract restoreState(state: unknown): void;
}
