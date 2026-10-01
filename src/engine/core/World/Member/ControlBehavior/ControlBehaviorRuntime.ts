import { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { BehaviourTreeOptions } from "~/lib/mistreevous/BehaviourTreeOptions";
import { State } from "~/lib/mistreevous/State";
import { createExecutionContext } from "../BehaviorTree/ExecutionContext";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";

export type ControlBehaviorDefinition = string | RootNodeDefinition | RootNodeDefinition[];

export interface ControlBehaviorRuntimeOptions {
	getDeltaTimeMs: () => number;
	getCurrentTimeMs: () => number;
	resolveProperty: (path: string) => unknown;
}

/**
 * Member 自有的 AI 行为树运行时（ADR 0054）。
 *
 * 它只负责按 Tick 推进行为树并保留暂停状态；不参与技能效果执行，
 * 也不由 EffectBtManager 管理。AI 行为树的 action 只提交控制输入。
 */
export class ControlBehaviorRuntime {
	private tree: BehaviourTree | null = null;
	private paused = false;

	constructor(
		definition: ControlBehaviorDefinition,
		agent: string,
		private readonly bindings: Record<string, unknown>,
		private readonly context: MemberSharedRuntime,
		private readonly options: ControlBehaviorRuntimeOptions,
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
		return createExecutionContext({
			baseContext: this.context,
			memberName: this.context.name,
			bindings: this.bindings,
			agent,
			agentOwner: {
				getContext: () => this.context,
				getDeltaTimeMs: () => this.options.getDeltaTimeMs(),
				getCurrentTimeMs: () => this.options.getCurrentTimeMs(),
			},
		}).context;
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

	reset(definition: ControlBehaviorDefinition, agent: string): void {
		this.tree = definition
			? new BehaviourTree(definition, this.buildExecutionContext(agent), this.createTreeOptions())
			: null;
		this.paused = false;
	}
}
