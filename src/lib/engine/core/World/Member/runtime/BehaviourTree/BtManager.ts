import { createLogger } from "~/lib/Logger";
import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { BehaviourTreeOptions } from "~/lib/mistreevous/BehaviourTreeOptions";
import { State } from "~/lib/mistreevous/State";
import type { BtManagerCheckpoint, Checkpointable } from "../../../../types";
import type { MemberEventType } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";
import type { MemberBtManagerEnv } from "./BtManagerEnv";

const log = createLogger("BtManager");

type BtEntry = {
	bt: BehaviourTree;
};

export class BtManager<
	TExtraAttrKey extends string = never,
	TContext extends MemberSharedRuntime<TExtraAttrKey> = MemberSharedRuntime<TExtraAttrKey>,
	TStateEvent extends MemberEventType = MemberEventType,
> implements Checkpointable<BtManagerCheckpoint>
{
	private activeEffectEntry: BtEntry | undefined;
	private parallelEntries: Map<string, BtEntry> = new Map();
	private btOptions: BehaviourTreeOptions = {};

	constructor(
		private env: MemberBtManagerEnv<TStateEvent, TExtraAttrKey, TContext>,
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
		};
	}

	private buildExecutionContext(agent?: string): TContext & Record<string, unknown> {
		const executionContext = Object.create(this.env.getContext()) as TContext & Record<string, unknown>;
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
	 */
	private mergeAgentMembers(context: Record<string, unknown>, agent: string | undefined): void {
		if (!agent) return;

		type AgentInstance = Record<string, unknown>;
		type AgentCtor = new () => AgentInstance;

		let AgentClass: AgentCtor;
		try {
			const factory = new Function("BehaviourTree", "State", "owner", `return ${agent};`) as (
				bt: typeof BehaviourTree,
				state: typeof State,
				env: MemberBtManagerEnv<TStateEvent, TExtraAttrKey, TContext>,
			) => AgentCtor;
			AgentClass = factory(BehaviourTree, State, this.env);
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
				this.env.send({ type: "技能执行完成" } as TStateEvent);
			} else {
				this.activeEffectEntry.bt.step();
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
	): BehaviourTree | undefined {
		if (!definition) return undefined;
		const bt = new BehaviourTree(definition, this.buildExecutionContext(agent), this.createBtOptions());
		this.activeEffectEntry = { bt };
		return bt;
	}

	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
	): BehaviourTree | undefined {
		const bt = new BehaviourTree(definition, this.buildExecutionContext(agent), this.createBtOptions());
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

	hasBuff(name: string): boolean {
		return this.parallelEntries.has(name);
	}

	clear(): void {
		this.activeEffectEntry = undefined;
		this.parallelEntries.clear();
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
	}
}
