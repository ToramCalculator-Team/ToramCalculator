import type { Checkpointable } from "~/engine/core/World/Checkpoint";
import { createLogger } from "~/lib/logger";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { BehaviourTreeOptions } from "~/lib/mistreevous/BehaviourTreeOptions";
import { State } from "~/lib/mistreevous/State";
import { ModifierType } from "../AttributeContainer/AttributeContainerTypes";
import type { MemberRuntime } from "../types";
import type { EffectBtManagerCheckpoint } from "./types";

const log = createLogger("EffectBtManager");

type BtEntry = {
	bt: BehaviourTree;
};

// 如果未来 checkpoint restore 必须整体替换 runtime，那么就不应该让 agent 直接持有 runtime 原型，而应该让行
// 为树的 BehaviourTreeOptions.resolveProperty 或 agent owner 提供动态读取入口。不过按当前代码结构，runtime
// 是成员内长期持有并修改字段的对象，因此共享原型是更简单的方案。
export class EffectBtManager<TContext extends MemberRuntime> implements Checkpointable<EffectBtManagerCheckpoint> {
	private activeEffectEntry: BtEntry | undefined;
	private parallelEntries: Map<string, BtEntry> = new Map();
	/** 当前 step 是否来自 active effect BT；只有它能声明技能视觉状态。 */
	private steppingContext: "none" | "active-effect" = "none";

	constructor(
		private agent: {
			prototypeData: TContext; // 由于会将公共上下文整合进每颗行为树的agent中，
			commonAgent: Record<string, unknown>;
		},
		private btOptions: BehaviourTreeOptions,
	) {}

	private buildAgent(
		agent?: string, // 字符串agent对象
		treeData?: Record<string, unknown>, // 注入到单棵行为树 agent 中、由树注册者提供的静态或实例级数据。
	): TContext & Record<string, unknown> {
		const context = Object.create(this.agent.prototypeData) as TContext & Record<string, unknown>;

		// 1. 添加 bindings
		for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(this.agent.prototypeData))) {
			if (!(name in context)) {
				Object.defineProperty(context, name, { ...descriptor, configurable: true });
			}
		}

		// 2. 编译并混入 agent
		if (agent?.trim()) {
			try {
				const factory = new Function("BehaviourTree", "State", "ModifierType", "owner", `return ${agent};`) as (
					bt: typeof BehaviourTree,
					state: typeof State,
					modType: typeof ModifierType,
					owner: unknown,
				) => new () => Record<string, unknown>;

				const AgentClass = factory(BehaviourTree, State, ModifierType, this.env);
				const instance = new AgentClass();

				// 混入 agent 实例成员和原型方法
				for (const key of Object.getOwnPropertyNames(instance)) {
					if (key !== "constructor" && !(key in context)) {
						const descriptor = Object.getOwnPropertyDescriptor(instance, key);
						if (descriptor) {
							Object.defineProperty(context, key, { ...descriptor, configurable: true });
						}
					}
				}

				const prototype = AgentClass.prototype as object;
				for (const key of Object.getOwnPropertyNames(prototype)) {
					if (key !== "constructor" && !(key in context)) {
						const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
						if (descriptor) {
							Object.defineProperty(context, key, { ...descriptor, configurable: true });
						}
					}
				}
			} catch (error) {
				log.warn(
					`[${this.env.name}] Failed to compile agent: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// 3.添加treeData

		return context;
	}

	tickAll(): void {
		if (this.activeEffectEntry) {
			const state = this.activeEffectEntry.bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				this.activeEffectEntry = undefined;
				// 技能生命周期必须在同一个引擎 Tick 内同步收敛，连续快进不得依赖 Promise 微任务。
				// EffectBtManager 的通用 FSM 泛型无法枚举 Player 专属完成事件；active effect 只由 Player 技能路径注册。
				this.env.send({ type: "技能执行完成" });
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
			} else {
				entry.bt.step();
			}
		});
	}

	// FSM直接调用
	registerActiveEffectBt(
		definition?: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		if (!definition) return undefined;
		const bt = new BehaviourTree(definition, this.buildAgent(agent), this.btOptions);
		this.activeEffectEntry = { bt };
		return bt;
	}

	// FSM直接调用
	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
		localContext?: Record<string, unknown>,
	): BehaviourTree | undefined {
		const bt = new BehaviourTree(definition, this.buildAgent(agent), this.btOptions);
		this.parallelEntries.set(name, { bt });
		return bt;
	}

	unregisterActiveEffectBt(): void {
		this.activeEffectEntry = undefined;
	}

	unregisterParallelBt(name: string): void {
		this.parallelEntries.delete(name);
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

	/** 观察具名并行 buff/passive 行为是否仍在运行。 */
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
	}

	/** state 叶子只允许 active effect BT 写入。 */
	isSteppingActiveEffect(): boolean {
		return this.steppingContext === "active-effect";
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

	captureCheckpoint(): EffectBtManagerCheckpoint {
		const parallelEntries: EffectBtManagerCheckpoint["parallelEntries"] = [];
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

	restoreCheckpoint(_checkpoint: EffectBtManagerCheckpoint): void {
		this.activeEffectEntry = undefined;
		this.parallelEntries.clear();
	}
}
