import type { Member } from "../../Member";
import type { CommonBoard } from "../Agent/CommonBoard";
import type { CommonContext } from "../Agent/CommonContext";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";
import type { PipelineExecutionContext, PipelineExecutionMeta } from "./PipelineExecutionContext";
import { PipelineManager } from "./PiplineManager";
import type { PipelineRegistry } from "./PipelineRegistry";
import type { ActionPool, PipelineDef } from "./types";

type PipelineRuntimeOwner<TRuntimeContext extends CommonContext> = Member<
	string,
	MemberEventType,
	MemberStateContext,
	CommonBoard & TRuntimeContext
>;

/**
 * 成员级管线执行器。
 *
 * 当前职责：
 * - 从 registry 同步基础 pipeline 定义
 * - 为成员提供统一的 run 入口
 * - 生成后续可接入的 PipelineExecutionContext
 *
 * 当前不负责：
 * - 状态实例生命周期
 * - FSM/BT 自动调度
 */
export class MemberPipelineRuntime<TRuntimeContext extends CommonContext = CommonContext> {
	private readonly manager: PipelineManager<CommonContext, ActionPool<CommonContext>>;
	private registry: PipelineRegistry<CommonContext, ActionPool<CommonContext>>;

	constructor(
		private readonly owner: PipelineRuntimeOwner<TRuntimeContext>,
		registry: PipelineRegistry<CommonContext, ActionPool<CommonContext>>,
	) {
		this.registry = registry;
		this.manager = new PipelineManager(this.registry.actionPool);
		this.syncRegistry();
	}

	setRegistry(registry: PipelineRegistry<CommonContext, ActionPool<CommonContext>>): void {
		this.registry = registry;
		this.syncRegistry();
	}

	getRegistry(): PipelineRegistry<CommonContext, ActionPool<CommonContext>> {
		return this.registry;
	}

	getManager(): PipelineManager<CommonContext, ActionPool<CommonContext>> {
		return this.manager;
	}

	syncRegistry(): void {
		this.manager.replacePipelines(this.registry.getPipelineDefSnapshot());
	}

	setMemberOverrides(overrides?: PipelineDef<ActionPool<CommonContext>>): void {
		this.manager.setMemberOverrides(overrides);
	}

	setSkillOverrides(overrides?: PipelineDef<ActionPool<CommonContext>>): void {
		this.manager.setSkillOverrides(overrides);
	}

	clearMemberOverrides(): void {
		this.manager.clearMemberOverrides();
	}

	clearSkillOverrides(): void {
		this.manager.clearSkillOverrides();
	}

	run(pipelineName: string, params?: Record<string, unknown>) {
		this.syncRegistry();
		return this.manager.run(pipelineName, this.owner.runtimeContext as CommonContext, params);
	}

	createExecutionContext<
		TInput = Record<string, unknown>,
		TScratch extends Record<string, unknown> = Record<string, unknown>,
		TOutput = Record<string, unknown>,
	>(
		pipelineName: string,
		input: TInput,
		options?: {
			source?: PipelineRuntimeOwner<TRuntimeContext>;
			target?: PipelineRuntimeOwner<TRuntimeContext>;
			scratch?: TScratch;
			output?: TOutput;
			meta?: Omit<PipelineExecutionMeta, "pipelineName">;
		},
	): PipelineExecutionContext<TRuntimeContext, string, TInput, TScratch, TOutput> {
		return {
			subject: this.owner,
			source: options?.source,
			target: options?.target,
			runtime: this.owner.runtimeContext as TRuntimeContext,
			stats: this.owner.statContainer,
			services: this.owner.runtimeContext,
			input,
			scratch: (options?.scratch ?? {}) as TScratch,
			output: (options?.output ?? {}) as TOutput,
			meta: {
				pipelineName,
				frame: this.owner.runtimeContext.getCurrentFrame?.(),
				...options?.meta,
			},
		};
	}
}
