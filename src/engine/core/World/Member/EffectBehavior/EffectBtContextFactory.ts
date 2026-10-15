import type { EventObject } from "xstate";
import type { NestedSchema } from "../AttributeContainer/SchemaTypes";
import {
	type CreateExecutionContextOptions,
	createExecutionContext,
	type ExecutionContextWarning,
} from "../BehaviorTree/ExecutionContext";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";
import type { EffectBtManagerEnv } from "./types";

export type BtContextFactoryWarning = ExecutionContextWarning;

export type CreateBtContextOptions<
	TFSMEvent extends EventObject,
	TSchema extends NestedSchema,
	TContext extends MemberSharedRuntime,
> = {
	env: EffectBtManagerEnv<TFSMEvent, TSchema, TContext>;
	btBindings?: Record<string, unknown>;
	agent?: string;
	onWarning?: (warning: BtContextFactoryWarning) => void;
};

export type CreateBtContextResult<TContext extends MemberSharedRuntime> = {
	context: TContext & Record<string, unknown>;
	warnings: BtContextFactoryWarning[];
};

/** 编辑器预览使用的兼容入口；上下文合并规则由 BehaviorTree ExecutionContext 统一提供。 */
export function createBtContext<
	TFSMEvent extends EventObject,
	TSchema extends NestedSchema,
	TContext extends MemberSharedRuntime,
>(options: CreateBtContextOptions<TFSMEvent, TSchema, TContext>): CreateBtContextResult<TContext> {
	const { env, btBindings, agent, onWarning } = options;
	const executionOptions: CreateExecutionContextOptions = {
		baseContext: env.getContext(),
		memberName: env.name,
		bindings: btBindings,
		agent,
		agentOwner: env,
		onWarning,
	};
	return createExecutionContext(executionOptions);
}
