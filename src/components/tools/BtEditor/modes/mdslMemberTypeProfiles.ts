import type { BtKind, MemberType } from "@db/schema/enums";
import { mergePools } from "~/engine/core/World/Member/BehaviorTree/NodeMethods/mergePools";
import { CommonControlBehaviorActionPool } from "~/engine/core/World/Member/ControlBehavior/NodeMethods/ActionMethods";
import { CommonControlBehaviorConditionPool } from "~/engine/core/World/Member/ControlBehavior/NodeMethods/ConditionMethods";
import { CommonEffectActionPool } from "~/engine/core/World/Member/EffectBehavior/NodeMethods/ActionMethods";
import { CommonEffectConditionPool } from "~/engine/core/World/Member/EffectBehavior/NodeMethods/ConditionMethods";
import { DefaultMemberSharedRuntime } from "~/engine/core/World/Member/runtime/SharedRuntime";
import { MobControlBehaviorActionPool } from "~/engine/core/World/Member/types/Mob/ControlBehavior/NodeMethods/ActionMethods";
import { MobControlBehaviorConditionPool } from "~/engine/core/World/Member/types/Mob/ControlBehavior/NodeMethods/ConditionMethods";
import { MobEffectActionPool } from "~/engine/core/World/Member/types/Mob/EffectBehavior/NodeMethods/ActionMethods";
import { MobEffectConditionPool } from "~/engine/core/World/Member/types/Mob/EffectBehavior/NodeMethods/ConditionMethods";
import { PlayerControlBehaviorActionPool } from "~/engine/core/World/Member/types/Player/ControlBehavior/NodeMethods/ActionMethods";
import { PlayerControlBehaviorConditionPool } from "~/engine/core/World/Member/types/Player/ControlBehavior/NodeMethods/ConditionMethods";
import { PlayerEffectActionPool } from "~/engine/core/World/Member/types/Player/EffectBehavior/NodeMethods/ActionMethods";
import { PlayerEffectConditionPool } from "~/engine/core/World/Member/types/Player/EffectBehavior/NodeMethods/ConditionMethods";
import type { MdslCallablePool } from "./mdslIntellisense";

export type MdslProfileConfig = {
	memberType: MemberType;
	treeKind: BtKind;
	actionPool: MdslCallablePool;
	conditionPool: MdslCallablePool;
	propertyObject: Record<string, unknown>;
};

const profileByMemberType = (
	memberType: MemberType,
	treeKind: BtKind,
): Pick<MdslProfileConfig, "actionPool" | "conditionPool"> => {
	if (treeKind === "control") {
		switch (memberType) {
			case "Player":
				return {
					actionPool: mergePools(CommonControlBehaviorActionPool, PlayerControlBehaviorActionPool),
					conditionPool: mergePools(CommonControlBehaviorConditionPool, PlayerControlBehaviorConditionPool),
				};
			case "Mob":
				return {
					actionPool: mergePools(CommonControlBehaviorActionPool, MobControlBehaviorActionPool),
					conditionPool: mergePools(CommonControlBehaviorConditionPool, MobControlBehaviorConditionPool),
				};
			default:
				return {
					actionPool: CommonControlBehaviorActionPool,
					conditionPool: CommonControlBehaviorConditionPool,
				};
		}
	}

	switch (memberType) {
		case "Player":
			return {
				actionPool: mergePools(CommonEffectActionPool, PlayerEffectActionPool),
				conditionPool: mergePools(CommonEffectConditionPool, PlayerEffectConditionPool),
			};
		case "Mob":
			return {
				actionPool: mergePools(CommonEffectActionPool, MobEffectActionPool),
				conditionPool: mergePools(CommonEffectConditionPool, MobEffectConditionPool),
			};
		default:
			return { actionPool: CommonEffectActionPool, conditionPool: CommonEffectConditionPool };
	}
};

/** 根据行为树用途和 MemberType 获取对应的 MDSL IntelliSense 配置。 */
export const getMdslProfileConfig = (memberType: MemberType, treeKind: BtKind): MdslProfileConfig => ({
	memberType,
	treeKind,
	...profileByMemberType(memberType, treeKind),
	propertyObject: DefaultMemberSharedRuntime,
});
