import type { MemberType } from "@db/schema/enums";
import { CommonEffectActionPool } from "~/engine/core/World/Member/EffectBehavior/NodeMethods/ActionMethods";
import { CommonEffectConditionPool } from "~/engine/core/World/Member/EffectBehavior/NodeMethods/ConditionMethods";
import { CommonBehaviorActionPool } from "~/engine/core/World/Member/Behavior/NodeMethods/ActionMethods";
import { CommonBehaviorConditionPool } from "~/engine/core/World/Member/Behavior/NodeMethods/ConditionMethods";
import type { MdslCallablePool } from "./mdslIntellisense";
import { DefaultMemberSharedRuntime } from "~/engine/core/World/Member/runtime/SharedRuntime";
import { MobEffectActionPool } from "~/engine/core/World/Member/types/Mob/EffectBehavior/NodeMethods/ActionMethods";
import { MobEffectConditionPool } from "~/engine/core/World/Member/types/Mob/EffectBehavior/NodeMethods/ConditionMethods";
import { MobBehaviorActionPool } from "~/engine/core/World/Member/types/Mob/Behavior/NodeMethods/ActionMethods";
import { MobBehaviorConditionPool } from "~/engine/core/World/Member/types/Mob/Behavior/NodeMethods/ConditionMethods";
import { PlayerEffectActionPool } from "~/engine/core/World/Member/types/Player/EffectBehavior/NodeMethods/ActionMethods";
import { PlayerEffectConditionPool } from "~/engine/core/World/Member/types/Player/EffectBehavior/NodeMethods/ConditionMethods";
import { PlayerBehaviorActionPool } from "~/engine/core/World/Member/types/Player/Behavior/NodeMethods/ActionMethods";
import { PlayerBehaviorConditionPool } from "~/engine/core/World/Member/types/Player/Behavior/NodeMethods/ConditionMethods";

export type BehaviorTreeKind = "control" | "effect";

export type MdslProfileConfig = {
	memberType: MemberType;
	treeKind: BehaviorTreeKind;
	actionPool: MdslCallablePool;
	conditionPool: MdslCallablePool;
	propertyObject: Record<string, unknown>;
};

const profileByMemberType = (
	memberType: MemberType,
	treeKind: BehaviorTreeKind,
): Pick<MdslProfileConfig, "actionPool" | "conditionPool"> => {
	if (treeKind === "control") {
		switch (memberType) {
			case "Player":
				return {
					actionPool: { ...CommonBehaviorActionPool, ...PlayerBehaviorActionPool },
					conditionPool: { ...CommonBehaviorConditionPool, ...PlayerBehaviorConditionPool },
				};
			case "Mob":
				return {
					actionPool: { ...CommonBehaviorActionPool, ...MobBehaviorActionPool },
					conditionPool: { ...CommonBehaviorConditionPool, ...MobBehaviorConditionPool },
				};
			default:
				return { actionPool: {}, conditionPool: {} };
		}
	}

	switch (memberType) {
		case "Player":
			return {
				actionPool: { ...CommonEffectActionPool, ...PlayerEffectActionPool },
				conditionPool: { ...CommonEffectConditionPool, ...PlayerEffectConditionPool },
			};
		case "Mob":
			return {
				actionPool: { ...CommonEffectActionPool, ...MobEffectActionPool },
				conditionPool: { ...CommonEffectConditionPool, ...MobEffectConditionPool },
			};
		default:
			return { actionPool: CommonEffectActionPool, conditionPool: CommonEffectConditionPool };
	}
};

/** 根据行为树用途和 MemberType 获取对应的 MDSL IntelliSense 配置。 */
export const getMdslProfileConfig = (
	memberType: MemberType,
	treeKind: BehaviorTreeKind = "effect",
): MdslProfileConfig => ({
	memberType,
	treeKind,
	...profileByMemberType(memberType, treeKind),
	propertyObject: DefaultMemberSharedRuntime,
});
