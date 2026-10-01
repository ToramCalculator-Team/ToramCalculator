import type { EventObject } from "xstate";
import {
	type CreateExecutionContextOptions,
	createExecutionContext,
	type ExecutionContextWarning,
} from "../BehaviorTree/ExecutionContext";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";
import type { EffectBtManagerEnv } from "./EffectBtManagerEnv";

export type BtContextFactoryWarning = ExecutionContextWarning;

export type CreateBtContextOptions<
	TFSMEvent extends EventObject,
	TExtraAttrKey extends string = string,
	TContext extends MemberSharedRuntime<TExtraAttrKey> = MemberSharedRuntime<TExtraAttrKey>,
> = {
	env: EffectBtManagerEnv<TFSMEvent, TExtraAttrKey, TContext>;
	btBindings?: Record<string, unknown>;
	agent?: string;
	onWarning?: (warning: BtContextFactoryWarning) => void;
};

export type CreateBtContextResult<
	TExtraAttrKey extends string = string,
	TContext extends MemberSharedRuntime<TExtraAttrKey> = MemberSharedRuntime<TExtraAttrKey>,
> = {
	context: TContext & Record<string, unknown>;
	warnings: BtContextFactoryWarning[];
};

/** 编辑器预览使用的兼容入口；上下文合并规则由 BehaviorTree ExecutionContext 统一提供。 */
export function createBtContext<
	TFSMEvent extends EventObject,
	TExtraAttrKey extends string,
	TContext extends MemberSharedRuntime<TExtraAttrKey>,
>(options: CreateBtContextOptions<TFSMEvent, TExtraAttrKey, TContext>): CreateBtContextResult<TExtraAttrKey, TContext> {
	const { env, btBindings, agent, onWarning } = options;
	const executionOptions: CreateExecutionContextOptions<TContext> = {
		baseContext: env.getContext(),
		memberName: env.name,
		bindings: btBindings,
		agent,
		agentOwner: env,
		onWarning,
	};
	return createExecutionContext(executionOptions);
}
