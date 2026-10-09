import type { ActionPool, ConditionPool } from "../BehaviorTree/NodeMethods/MethodTypes";
import { assertDisjointPools } from "../BehaviorTree/NodeMethods/mergePools";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../BehaviorTree/NodeMethods/utils";
import type { NestedSchema } from "../runtime/AttributeContainer/SchemaTypes";
import type {
	CommonEffectBtCapabilities,
	CommonEffectBtContext,
	EffectBtCapabilities,
	EffectBtContext,
} from "./EffectBtTypes";
import { CommonEffectActionPool } from "./NodeMethods/ActionMethods";
import { CommonEffectConditionPool } from "./NodeMethods/ConditionMethods";

/**
 * 组合 Member 公共效果池与角色专属效果池。
 * 底层 pool 转换器保持通用，不知道 Behavior 或 EffectBehavior 的领域边界。
 */
export const createEffectBindings = <
	TSchema extends NestedSchema,
	TContext extends EffectBtContext<TSchema>,
	TActions extends ActionPool<TContext, EffectBtCapabilities<TSchema>>,
	TConditions extends ConditionPool<TContext, EffectBtCapabilities<TSchema>>,
>(
	context: TContext,
	actionPool: TActions,
	conditionPool: TConditions,
	capabilities: EffectBtCapabilities<TSchema>,
) => {
	assertDisjointPools(CommonEffectActionPool, actionPool);
	assertDisjointPools(CommonEffectConditionPool, conditionPool);

	// 类型安全说明：
	// - CommonEffectActionPool 只使用 MemberBaseNestedSchema 的基础属性
	// - 所有 TSchema 都包含 MemberBaseNestedSchema 的字段
	// - 因此 EffectBtCapabilities<TSchema> 包含 CommonEffectBtCapabilities 所需的所有字段
	// - 向下转型是安全的（Common actions 不会访问 TSchema 特有的字段）
	const commonCapabilities = capabilities as unknown as CommonEffectBtCapabilities;
	const commonContext = context as unknown as CommonEffectBtContext;

	return {
		...actionPoolToInvokers(commonContext, CommonEffectActionPool, commonCapabilities),
		...actionPoolToInvokers(context, actionPool, capabilities),
		...conditionPoolToInvokers(commonContext, CommonEffectConditionPool, commonCapabilities),
		...conditionPoolToInvokers(context, conditionPool, capabilities),
	};
};

export type MemberEffectBindings = ReturnType<typeof createEffectBindings>;
