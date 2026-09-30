import type { ActionPool, ConditionPool } from "../runtime/NodeMethods/MethodTypes";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../runtime/NodeMethods/utils";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";
import type { MemberBtCapabilities } from "./EffectBtManagerEnv";
import { CommonEffectActionPool } from "./NodeMethods/ActionMethods";
import { CommonEffectConditionPool } from "./NodeMethods/ConditionMethods";

export type EffectBtContext<TExtraAttrKey extends string = string> = MemberSharedRuntime<TExtraAttrKey> &
	Record<string, unknown>;

const effectContextTypeHint = {} as EffectBtContext;

/**
 * 创建所有成员共享的效果树绑定。
 *
 * CommonEffect 池在这里硬编码，是因为本函数就是 EffectBehavior 的组合边界；
 * 它固定提供 Member 公共效果能力，调用方只需要传入角色类型的专属池。
 */
export const createCommonEffectBindings = <TExtraAttrKey extends string>(
	capabilities: MemberBtCapabilities<TExtraAttrKey>,
) => {
	const context = effectContextTypeHint as EffectBtContext<TExtraAttrKey>;
	return {
		...actionPoolToInvokers(context, CommonEffectActionPool, capabilities),
		...conditionPoolToInvokers(context, CommonEffectConditionPool, capabilities),
	};
};

export type CommonEffectBindings = ReturnType<typeof createCommonEffectBindings>;

/**
 * 组合 Member 公共效果池与角色专属效果池。
 * 底层 pool 转换器保持通用，不知道 Behavior 或 EffectBehavior 的领域边界。
 */
export const createEffectBindings = <
	TExtraAttrKey extends string,
	TContext extends EffectBtContext<TExtraAttrKey>,
	TActions extends ActionPool<TContext, MemberBtCapabilities<TExtraAttrKey>>,
	TConditions extends ConditionPool<TContext, MemberBtCapabilities<TExtraAttrKey>>,
>(
	context: TContext,
	actionPool: TActions,
	conditionPool: TConditions,
	capabilities: MemberBtCapabilities<TExtraAttrKey>,
) => ({
	...createCommonEffectBindings<TExtraAttrKey>(capabilities),
	...actionPoolToInvokers(context, actionPool, capabilities),
	...conditionPoolToInvokers(context, conditionPool, capabilities),
});

export type MemberEffectBindings = ReturnType<typeof createEffectBindings>;
