import type { EventObject } from "xstate";
import { createLogger } from "~/lib/logger";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { BehaviourTreeOptions } from "~/lib/mistreevous/BehaviourTreeOptions";
import { State } from "~/lib/mistreevous/State";
import type { Checkpointable, EffectBtManagerCheckpoint } from "../../../types";
import { createExecutionContext } from "../BehaviorTree/ExecutionContext";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";
import type { MemberFSMEvent } from "../StateMachine/types";
import type { EffectBtManagerEnv } from "./EffectBtManagerEnv";

const log = createLogger("EffectBtManager");

type BtEntry = {
	bt: BehaviourTree;
};

export class EffectBtManager<
	TExtraAttrKey extends string = never,
	TContext extends MemberSharedRuntime<TExtraAttrKey> = MemberSharedRuntime<TExtraAttrKey>,
	TFSMEvent extends EventObject = MemberFSMEvent,
> implements Checkpointable<EffectBtManagerCheckpoint>
{
	private activeEffectEntry: BtEntry | undefined;
	private parallelEntries: Map<string, BtEntry> = new Map();
	private btOptions: BehaviourTreeOptions = {};
	/** 当前 step 是否来自 active effect BT；只有它能声明技能视觉状态。 */
	private steppingContext: "none" | "active-effect" = "none";

	constructor(
		private env: EffectBtManagerEnv<TFSMEvent, TExtraAttrKey, TContext>,
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
		return createExecutionContext({
			baseContext: this.env.getContext(),
			memberName: this.env.name,
			bindings: this.btBindings,
			localContext,
			agent,
			agentOwner: this.env,
			onWarning: (warning) => log.warn(warning.message),
		}).context;
	}

	tickAll(): void {
		if (this.activeEffectEntry) {
			const state = this.activeEffectEntry.bt.getState();
			if (state === State.SUCCEEDED || state === State.FAILED) {
				this.activeEffectEntry = undefined;
				this.clearActiveEffectStateDeclaration();
				// 技能生命周期必须在同一个引擎 Tick 内同步收敛，连续快进不得依赖 Promise 微任务。
				// EffectBtManager 的通用 FSM 泛型无法枚举 Player 专属完成事件；active effect 只由 Player 技能路径注册。
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
			} else {
				entry.bt.step();
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
		this.clearActiveEffectStateDeclaration();
	}

	/** state 叶子只允许 active effect BT 写入。 */
	isSteppingActiveEffect(): boolean {
		return this.steppingContext === "active-effect";
	}

	/** 供 FSM 中断动作清空当前技能视觉状态声明，不销毁行为树实例。 */
	clearStateDeclarations(): void {
		this.clearActiveEffectStateDeclaration();
	}

	private clearActiveEffectStateDeclaration(): void {
		this.env.getCapabilities().clearActiveEffectStateDeclaration();
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
		this.clearActiveEffectStateDeclaration();
	}
}
