import type { EventObject } from "xstate";
import { createLogger } from "~/lib/logger";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { BehaviourTreeOptions } from "~/lib/mistreevous/BehaviourTreeOptions";
import { State } from "~/lib/mistreevous/State";
import type { BtManagerCheckpoint, Checkpointable } from "../../../../types";
import { ModifierType } from "../AttributeContainer/AttributeContainer";
import type { MemberFSMEvent } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";
import type { MemberBtManagerEnv } from "./BtManagerEnv";

const log = createLogger("BtManager");

type BtEntry = {
	bt: BehaviourTree;
};

export class BtManager<
	TExtraAttrKey extends string = never,
	TContext extends MemberSharedRuntime<TExtraAttrKey> = MemberSharedRuntime<TExtraAttrKey>,
	TFSMEvent extends EventObject = MemberFSMEvent,
> implements Checkpointable<BtManagerCheckpoint>
{
	private activeEffectEntry: BtEntry | undefined;
	private parallelEntries: Map<string, BtEntry> = new Map();
	private btOptions: BehaviourTreeOptions = {};
	/** 当前 step 的执行上下文；state 声明只允许 active effect 和 member-flow 写入。 */
	private steppingContext: "none" | "active-effect" | "member-flow" = "none";

	constructor(
		private env: MemberBtManagerEnv<TFSMEvent, TExtraAttrKey, TContext>,
		/**
		 * BT-only callable bindings.
		 * Purpose: keep BT actions / conditions out of the checkpointable runtime blackboard.
		 */
		private readonly btBindings: Record<string, unknown> = {},
	) {}

	setRandom(randomFn: () => number): void {
		this.btOptions = { ...this.btOptions, random: randomFn };
	}

	private createBtOptions(): BehaviourTreeOptions {
		return {
			...this.btOptions,
			getDeltaTimeMs: () => this.env.getDeltaTimeMs(),
			getCurrentTimeMs: () => this.env.getCapabilities().services.getCurrentTimeMs(),
			resolveProperty: (path: string) => {
				const stat = this.env.getCapabilities().attributeContainer;
				if (stat.hasKey(path)) {
					// hasKey 已在运行时确认动态 MDSL 路径属于当前 AttributeContainer；类型系统无法从 boolean 推导泛型键。
					return stat.getValue(path as Parameters<typeof stat.getValue>[0]);
				}
				return undefined;
			},
		};
	}

	private buildExecutionContext(
		agent?: string,
		localContext?: Record<string, unknown>,
	): TContext & Record<string, unknown> {
		const executionContext = Object.create(this.env.getContext()) as TContext & Record<string, unknown>;
		// 注入 per-tree 本地上下文（如 skill 信息），优先级高于共享 runtime
		if (localContext) {
			for (const [key, value] of Object.entries(localContext)) {
				Object.defineProperty(executionContext, key, {
					value,
					writable: true,
					enumerable: true,
					configurable: true,
				});
			}
		}
		for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(this.btBindings))) {
			if (Object.hasOwn(executionContext, name) || name in executionContext) {
				log.warn(`[${this.env.name}] skipped BT binding "${name}" because the slot already exists`);
				continue;
			}
			Object.defineProperty(executionContext, name, {
				...descriptor,
				configurable: true,
			});
		}
		this.mergeAgentMembers(executionContext, agent?.trim());
		return executionContext;
	}

	/**
	 * 将行为树自定义 agent class 的成员合并到本次执行上下文。
	 *
	 * 设计说明：
	 * - 每棵 BT 使用独立 executionContext，避免把 agent 成员写回 checkpoint runtime。
	 * - 冲突时保留 runtime / bindings 的既有槽位，agent 只补充缺失成员。
	 * - agent 通过 `new Function` 编译，只适用于受信任的引擎配置；Worker 受限全局对象不是强安全沙箱。
	 */
	private mergeAgentMembers(context: Record<string, unknown>, agent: string | undefined): void {
		if (!agent) return;

		type AgentInstance = Record<string, unknown>;
		type AgentCtor = new () => AgentInstance;

		let AgentClass: AgentCtor;
		try {
			const factory = new Function("BehaviourTree", "State", "ModifierType", "owner", `return ${agent};`) as (
				bt: typeof BehaviourTree,
				state: typeof State,
				modType: typeof ModifierType,
				env: MemberBtManagerEnv<TFSMEvent, TExtraAttrKey, TContext>,
			) => AgentCtor;
			AgentClass = factory(BehaviourTree, State, ModifierType, this.env);
		} catch (error) {
			log.warn(`[${this.env.name}] failed to compile agent: ${error instanceof Error ? error.message : String(error)}`);
			return;
		}

		let instance: AgentInstance;
		try {
			instance = new AgentClass();
		} catch (error) {
			log.warn(`[${this.env.name}] failed to init agent: ${error instanceof Error ? error.message : String(error)}`);
			return;
		}

		const register = (name: string, desc: PropertyDescriptor): void => {
			if (!name || name === "constructor") return;
			if (name in context) {
				log.warn(`[${this.env.name}] skipped agent member "${name}" because the slot already exists`);
				return;
			}
			Object.defineProperty(context, name, { ...desc, configurable: true });
		};

		for (const key of Object.getOwnPropertyNames(instance)) {
			const desc = Object.getOwnPropertyDescriptor(instance, key);
			if (desc) register(key, desc);
		}
		const proto = AgentClass.prototype as object;
		for (const key of Object.getOwnPropertyNames(proto)) {
			if (key === "constructor") continue;
			const desc = Object.getOwnPropertyDescriptor(proto, key);
			if (desc) register(key, desc);
		}
	}

	tickAll(): void {
		if (this.activeEffectEntry) {
			const state = this.activeEffectEntry.bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				this.activeEffectEntry = undefined;
				this.clearActiveEffectStateDeclaration();
				// 技能生命周期必须在同一个引擎 Tick 内同步收敛，连续快进不得依赖 Promise 微任务。
				// BtManager 的通用 FSM 泛型无法枚举 Player 专属完成事件；active effect 只由 Player 技能路径注册。
				this.env.send({ type: "技能执行完成" } as TFSMEvent);
			} else {
				this.steppingContext = "active-effect";
				try {
					this.activeEffectEntry.bt.step();
				} finally {
					this.steppingContext = "none";
				}
			}
		}

		this.parallelEntries.forEach((entry, name) => {
			const state = entry.bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				this.parallelEntries.delete(name);
				if (name === "member-flow") this.clearMemberFlowStateDeclaration();
			} else {
				this.steppingContext = name === "member-flow" ? "member-flow" : "none";
				try {
					entry.bt.step();
				} finally {
					this.steppingContext = "none";
				}
			}
		});
	}

	registerActiveEffectBt(
		definition?: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
		localContext?: Record<string, unknown>,
	): BehaviourTree | undefined {
		if (!definition) return undefined;
		this.clearActiveEffectStateDeclaration();
		const bt = new BehaviourTree(definition, this.buildExecutionContext(agent, localContext), this.createBtOptions());
		this.activeEffectEntry = { bt };
		return bt;
	}

	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
		localContext?: Record<string, unknown>,
	): BehaviourTree | undefined {
		if (name === "member-flow") this.clearMemberFlowStateDeclaration();
		const bt = new BehaviourTree(definition, this.buildExecutionContext(agent, localContext), this.createBtOptions());
		this.parallelEntries.set(name, { bt });
		return bt;
	}

	unregisterActiveEffectBt(): void {
		this.activeEffectEntry = undefined;
		this.clearActiveEffectStateDeclaration();
	}

	unregisterParallelBt(name: string): void {
		this.parallelEntries.delete(name);
		if (name === "member-flow") this.clearMemberFlowStateDeclaration();
	}

	getParallelBt(name: string): BehaviourTree | undefined {
		return this.parallelEntries.get(name)?.bt;
	}

	getActiveEffectBt(): BehaviourTree | undefined {
		return this.activeEffectEntry?.bt;
	}

	/** 供引擎停止策略判断成员技能生命周期，避免外部读取 activeEffectEntry 私有结构。 */
	hasActiveEffectBt(): boolean {
		return !!this.activeEffectEntry;
	}

	hasRunningParallelBt(): boolean {
		for (const name of this.parallelEntries.keys()) {
			if (this.isParallelBtRunning(name)) return true;
		}
		return false;
	}

	/** 只观察具名并行行为，供停止策略区分 member-flow 与长期 Buff 等其他并行树。 */
	isParallelBtRunning(name: string): boolean {
		const entry = this.parallelEntries.get(name);
		if (!entry) return false;
		const state = entry.bt.getState();
		return state !== State.SUCCEEDED && state !== State.FAILED;
	}

	hasBuff(name: string): boolean {
		return this.parallelEntries.has(name);
	}

	clear(): void {
		this.activeEffectEntry = undefined;
		this.parallelEntries.clear();
		this.clearActiveEffectStateDeclaration();
		this.clearMemberFlowStateDeclaration();
	}

	/** state 叶子只允许 active effect 与 member-flow 两种执行上下文写入。 */
	isSteppingActiveEffect(): boolean {
		return this.steppingContext === "active-effect";
	}

	/** member-flow 是 Mob 与自动流程 BT 的动作状态来源。 */
	isSteppingMemberFlow(): boolean {
		return this.steppingContext === "member-flow";
	}

	/** 供 FSM 中断动作清空当前视觉状态声明，不销毁行为树实例。 */
	clearStateDeclarations(): void {
		this.clearActiveEffectStateDeclaration();
		this.clearMemberFlowStateDeclaration();
	}

	private clearActiveEffectStateDeclaration(): void {
		this.env.getCapabilities().clearActiveEffectStateDeclaration();
	}

	private clearMemberFlowStateDeclaration(): void {
		this.env.getCapabilities().clearMemberFlowStateDeclaration();
	}

	private deriveBtId(bt: BehaviourTree): string {
		try {
			const id = bt.getTreeNodeDetails()?.id;
			if (typeof id === "string" && id.length > 0) return id;
		} catch {
			// mistreevous may throw on malformed trees
		}
		return "<unknown>";
	}

	captureCheckpoint(): BtManagerCheckpoint {
		const parallelEntries: BtManagerCheckpoint["parallelEntries"] = [];
		for (const [name, entry] of this.parallelEntries) {
			parallelEntries.push({
				name,
				btId: this.deriveBtId(entry.bt),
			});
		}

		const active = this.activeEffectEntry;
		if (!active) {
			return { hasActiveEffect: false, parallelEntries };
		}

		return {
			hasActiveEffect: true,
			activeEffectBtId: this.deriveBtId(active.bt),
			parallelEntries,
		};
	}

	restoreCheckpoint(_checkpoint: BtManagerCheckpoint): void {
		this.activeEffectEntry = undefined;
		this.parallelEntries.clear();
		this.clearActiveEffectStateDeclaration();
		this.clearMemberFlowStateDeclaration();
	}
}
