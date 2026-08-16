import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { BehaviourTreeOptions } from "~/lib/mistreevous/BehaviourTreeOptions";
import { State } from "~/lib/mistreevous/State";
import { ModifierType } from "../AttributeContainer/AttributeContainer";
import type { MemberSharedRuntime } from "../types";

export type AiBehaviorDefinition = string | RootNodeDefinition | RootNodeDefinition[];

export interface AiBehaviorRuntimeOptions {
	getDeltaTimeMs: () => number;
	getCurrentTimeMs: () => number;
	resolveProperty: (path: string) => unknown;
}

/**
 * Member 自有的 AI 行为树运行时（ADR 0054）。
 *
 * 它只负责按 Tick 推进行为树并保留暂停状态；不参与技能效果执行，
 * 也不由 BtManager 管理。AI 行为树的 action 只提交控制输入。
 */
export class AiBehaviorRuntime {
	private tree: BehaviourTree | null = null;
	private paused = false;

	constructor(
		definition: AiBehaviorDefinition,
		agent: string,
		private readonly bindings: Record<string, unknown>,
		private readonly context: MemberSharedRuntime,
		private readonly options: AiBehaviorRuntimeOptions,
	) {
		if (!definition) return;
		const executionContext = this.buildExecutionContext(agent);
		this.tree = new BehaviourTree(definition, executionContext, this.createTreeOptions());
	}

	private createTreeOptions(): BehaviourTreeOptions {
		return {
			getDeltaTimeMs: this.options.getDeltaTimeMs,
			getCurrentTimeMs: this.options.getCurrentTimeMs,
			resolveProperty: this.options.resolveProperty,
		};
	}

	private buildExecutionContext(agent: string): MemberSharedRuntime & Record<string, unknown> {
		const executionContext = Object.create(this.context) as MemberSharedRuntime & Record<string, unknown>;
		for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(this.bindings))) {
			if (Object.hasOwn(executionContext, name) || name in executionContext) continue;
			Object.defineProperty(executionContext, name, { ...descriptor, configurable: true });
		}
		this.mergeAgentMembers(executionContext, agent?.trim());
		return executionContext;
	}

	/**
	 * 与 BtManager 相同的 agent 注入方式，保证 AI 行为树可以使用已有 board agent 定义。
	 * agent 只在受信任的引擎配置下编译；运行时黑板的 slot 优先级高于 agent 成员。
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
				modType: unknown,
				env: unknown,
			) => AgentCtor;
			AgentClass = factory(BehaviourTree, State, ModifierType, {
				getContext: () => this.context,
				getDeltaTimeMs: this.options.getDeltaTimeMs,
				getCurrentTimeMs: this.options.getCurrentTimeMs,
			});
		} catch {
			return;
		}

		let instance: AgentInstance;
		try {
			instance = new AgentClass();
		} catch {
			return;
		}

		const register = (name: string, desc: PropertyDescriptor): void => {
			if (!name || name === "constructor") return;
			if (name in context) return;
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

	step(): void {
		if (!this.tree || this.paused) return;
		const state = this.tree.getState();
		if (state === State.SUCCEEDED || state === State.FAILED) return;
		this.tree.step();
	}

	pause(): void {
		this.paused = true;
	}

	resume(): void {
		this.paused = false;
	}

	isPaused(): boolean {
		return this.paused;
	}

	isRunning(): boolean {
		if (!this.tree || this.paused) return false;
		const state = this.tree.getState();
		return state !== State.SUCCEEDED && state !== State.FAILED;
	}

	reset(definition: AiBehaviorDefinition, agent: string): void {
		this.tree = definition
			? new BehaviourTree(definition, this.buildExecutionContext(agent), this.createTreeOptions())
			: null;
		this.paused = false;
	}
}
