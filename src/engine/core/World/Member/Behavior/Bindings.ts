import type { ActionPool, ConditionPool } from "../runtime/NodeMethods/MethodTypes";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../runtime/NodeMethods/utils";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";
import type { MemberControlEvent } from "../StateMachine/types";
import { CommonBehaviorActionPool } from "./NodeMethods/ActionMethods";
import { CommonBehaviorConditionPool } from "./NodeMethods/ConditionMethods";

export interface MemberBehaviorCapabilities {
	submitControlInput(event: MemberControlEvent): void;
}

/** 控制行为树的黑板类型提示；动态 action/condition 成员不属于可 checkpoint 的 runtime。 */
export type BehaviorBtContext<TExtraAttrKey extends string = string> = MemberSharedRuntime<TExtraAttrKey> &
	Record<string, unknown>;

const behaviorContextTypeHint = {} as BehaviorBtContext;

/**
 * 创建所有成员共享的控制树绑定。
 *
 * CommonBehavior 池在这里硬编码，是因为本函数就是 Behavior 行为树的组合边界；
 * 它固定提供 Member 公共控制能力，调用方只需要传入角色类型的专属池。
 */
export const createCommonBehaviorBindings = <TExtraAttrKey extends string>(
	capabilities: MemberBehaviorCapabilities,
) => {
	const context = behaviorContextTypeHint as BehaviorBtContext<TExtraAttrKey>;
	return {
		...actionPoolToInvokers(context, CommonBehaviorActionPool, capabilities),
		...conditionPoolToInvokers(context, CommonBehaviorConditionPool, capabilities),
	};
};

export type CommonBehaviorBindings = ReturnType<typeof createCommonBehaviorBindings>;

/**
 * 组合 Member 公共控制池与角色专属控制池。
 * 底层 pool 转换器保持通用，不知道 Behavior 或 EffectBehavior 的领域边界。
 */
export const createBehaviorBindings = <
	TExtraAttrKey extends string,
	TContext extends BehaviorBtContext<TExtraAttrKey>,
	TActions extends ActionPool<TContext, MemberBehaviorCapabilities>,
	TConditions extends ConditionPool<TContext, MemberBehaviorCapabilities>,
>(
	context: TContext,
	actionPool: TActions,
	conditionPool: TConditions,
	capabilities: MemberBehaviorCapabilities,
) => ({
	...createCommonBehaviorBindings<TExtraAttrKey>(capabilities),
	...actionPoolToInvokers(context, actionPool, capabilities),
	...conditionPoolToInvokers(context, conditionPool, capabilities),
});

export type MemberBehaviorBindings = ReturnType<typeof createBehaviorBindings>;
