import {
	type CreateExecutionContextOptions,
	createExecutionContext,
	type ExecutionContextWarning,
} from "../BehaviorTree/ExecutionContext";
import type { MemberRuntime } from "../types";
import type { EffectBtManagerEnv } from "./types";

export type BtRuntimeFactoryWarning = ExecutionContextWarning;

export type CreateBtRuntimeOptions = {
	env: EffectBtManagerEnv;
	btBindings?: Record<string, unknown>;
	agent?: string;
	onWarning?: (warning: BtRuntimeFactoryWarning) => void;
};

export type CreateBtRuntimeResult<TContext extends MemberRuntime> = {
	context: TContext & Record<string, unknown>;
	warnings: BtRuntimeFactoryWarning[];
};

/** 编辑器预览使用的兼容入口；上下文合并规则由 BehaviorTree ExecutionContext 统一提供。 */
export function createBtRuntime<TContext extends MemberRuntime>(
	options: CreateBtRuntimeOptions,
): CreateBtRuntimeResult<TContext> {
	const { env, btBindings, agent, onWarning } = options;
	const executionOptions: CreateExecutionContextOptions = {
		bindings: btBindings,
		agent,
		agentOwner: env,
		onWarning,
	};
	return createExecutionContext(executionOptions);
}
