/**
 * Reactor 模型核心类型。
 *
 * 实现依据：Lohstroh et al., "Toward a Lingua Franca for Deterministic Concurrent Systems"
 * DOI: 10.1145/3448128，以及 lf-lang.org 官方 TypeScript target 文档。
 */

// ==================== 超稠密时间 (Superdense Time) ====================

/**
 * Tag = (logicalTime, microstep)，LF 超稠密时间模型。
 *
 * logicalTime：逻辑时间，独立于物理时钟，单位纳秒（与 LF 标准一致）。
 * microstep：微步，处理"同一逻辑时刻内的连续因果事件"。
 *   - schedule(action, 0) 产生的事件在 (t, m+1)，而非 (t, m)。
 *   - 两个事件逻辑同时当且仅当 logicalTime 和 microstep 均相等。
 *
 * 与引擎的映射：logicalTime = tickIndex * fixedStepNs，microstep 对应同 tick 内因果层次。
 */
export interface Tag {
	logicalTime: bigint; // 纳秒
	microstep: number;
}

/** Tag 比较：严格小于 */
export function tagLt(a: Tag, b: Tag): boolean {
	return a.logicalTime < b.logicalTime || (a.logicalTime === b.logicalTime && a.microstep < b.microstep);
}

/** Tag 比较：相等 */
export function tagEq(a: Tag, b: Tag): boolean {
	return a.logicalTime === b.logicalTime && a.microstep === b.microstep;
}

/** 产生下一微步 tag（schedule delay=0 时使用） */
export function nextMicrostep(tag: Tag): Tag {
	return { logicalTime: tag.logicalTime, microstep: tag.microstep + 1 };
}

// ==================== Reaction 声明 ====================

/**
 * 单个 Reaction 的静态声明。
 *
 * 调度器只读取元数据来构造 APG，不执行 body。
 * body 只能读取 triggers/uses 中声明的端口，只能写入 effects 中声明的端口或 action。
 *
 * - triggers：触发源（InputPort 名、LogicalAction 名、或特殊事件 "startup"/"shutdown"/"reset"）。
 *             任一 present 即触发本 Reaction。
 * - uses：只读依赖（不触发、但 body 会读取的端口），影响 APG 依赖边。
 * - effects：可能写入的 OutputPort 或 LogicalAction 名，用于推导下游依赖边。
 */
export interface ReactionDecl<TReactor = unknown> {
	triggers: string[];
	uses?: string[];
	effects?: string[];
	/** 所属 Mode 名（LF Modal Reactors）。undefined 表示不属于任何 Mode（全局常驻 Reaction）。 */
	mode?: string;
	body(self: TReactor, tag: Tag): void;
}

// ==================== 连接声明 ====================

/**
 * 端口连接：fromReactor.OutputPort → toReactor.InputPort。
 * after 为逻辑延迟（纳秒）；after=0n 表示同 logicalTime 的下一 microstep。
 */
export interface PortConnection {
	fromReactorId: string;
	fromPortName: string;
	toReactorId: string;
	toPortName: string;
	/** 逻辑延迟（纳秒）。undefined 或 0n 表示无延迟（同 tag 传播）。 */
	afterNs?: bigint;
}

// ==================== 待投递消息 ====================

/**
 * Reactor 间延迟投递的消息（Logical Action 的载体）。
 * executeAt：目标 tag，调度器在该 tag 时将值分发到对应 LogicalAction。
 * delayMs=0 → executeAt = (currentLogicalTime, currentMicrostep+1)。
 */
export interface PendingMessage {
	id: string;
	targetReactorId: string;
	actionName: string;
	value: unknown;
	executeAt: Tag;
}

// ==================== 调度器接口（Reactor 持有）====================

/**
 * Reactor 通过此接口与调度器通信，避免循环导入完整 ReactorScheduler 类型。
 * 由 ReactorScheduler._bind(reactor) 注入。
 */
export interface ReactorContext {
	/** 投递 Logical Action 消息 */
	enqueue(msg: PendingMessage): void;
	/** 注册动态创建的子 Reactor（对应 Actor create 原语） */
	register(reactor: import("./Reactor").Reactor, connections?: PortConnection[]): void;
	/** 获取当前 Tag */
	currentTag(): Tag;
}
