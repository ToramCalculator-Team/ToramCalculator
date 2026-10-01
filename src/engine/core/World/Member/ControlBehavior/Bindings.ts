import type { ActionPool, ConditionPool } from "../BehaviorTree/NodeMethods/MethodTypes";
import { assertDisjointPools } from "../BehaviorTree/NodeMethods/mergePools";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../BehaviorTree/NodeMethods/utils";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";
import type { MemberControlEvent } from "../StateMachine/types";
import { CommonControlBehaviorActionPool } from "./NodeMethods/ActionMethods";
import { CommonControlBehaviorConditionPool } from "./NodeMethods/ConditionMethods";

export interface MemberControlBehaviorCapabilities {
	submitControlInput(event: MemberControlEvent): void;
}

/** 控制行为树的黑板类型提示；动态 action/condition 成员不属于可 checkpoint 的 runtime。 */
export type ControlBehaviorContext<TExtraAttrKey extends string = string> = MemberSharedRuntime<TExtraAttrKey> &
	Record<string, unknown>;

const controlBehaviorContextTypeHint = {} as ControlBehaviorContext;

/**
 * 创建所有成员共享的控制树绑定。
 *
 * CommonControlBehavior 池在这里硬编码，是因为本函数就是控制行为树的组合边界；
 * 它固定提供 Member 公共控制能力，调用方只需要传入角色类型的专属池。
 */
export const createCommonControlBehaviorBindings = <TExtraAttrKey extends string>(
	capabilities: MemberControlBehaviorCapabilities,
) => {
	const context = controlBehaviorContextTypeHint as ControlBehaviorContext<TExtraAttrKey>;
	return {
		...actionPoolToInvokers(context, CommonControlBehaviorActionPool, capabilities),
		...conditionPoolToInvokers(context, CommonControlBehaviorConditionPool, capabilities),
	};
};

export type CommonControlBehaviorBindings = ReturnType<typeof createCommonControlBehaviorBindings>;

/**
 * 组合 Member 公共控制池与角色专属控制池。
 * 底层 pool 转换器保持通用，不知道控制行为树或效果行为树的领域边界。
 */
export const createControlBehaviorBindings = <
	TExtraAttrKey extends string,
	TContext extends ControlBehaviorContext<TExtraAttrKey>,
	TActions extends ActionPool<TContext, MemberControlBehaviorCapabilities>,
	TConditions extends ConditionPool<TContext, MemberControlBehaviorCapabilities>,
>(
	context: TContext,
	actionPool: TActions,
	conditionPool: TConditions,
	capabilities: MemberControlBehaviorCapabilities,
) => {
	assertDisjointPools(CommonControlBehaviorActionPool, actionPool);
	assertDisjointPools(CommonControlBehaviorConditionPool, conditionPool);

	return {
		...actionPoolToInvokers(context, CommonControlBehaviorActionPool, capabilities),
		...actionPoolToInvokers(context, actionPool, capabilities),
		...conditionPoolToInvokers(context, CommonControlBehaviorConditionPool, capabilities),
		...conditionPoolToInvokers(context, conditionPool, capabilities),
	};
};

export type MemberControlBehaviorBindings = ReturnType<typeof createControlBehaviorBindings>;
