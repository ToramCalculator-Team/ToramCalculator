import type { MemberType } from "@db/schema/enums";
import type { BtContext } from "~/lib/engine/core/World/Member/runtime/BehaviourTree/BtManagerEnv";
import { CommonActionPool } from "~/lib/engine/core/World/Member/runtime/Agent/CommonActions";
import { CommonConditionPool } from "~/lib/engine/core/World/Member/runtime/Agent/CommonCondition";
import type { ActionPool, ConditionPool } from "~/lib/engine/core/World/Member/runtime/Agent/type";
import { MobActionPool } from "~/lib/engine/core/World/Member/types/Mob/Agents/Actions";
import { MobConditionPool } from "~/lib/engine/core/World/Member/types/Mob/Agents/Condition";
import { PlayerActionPool } from "~/lib/engine/core/World/Member/types/Player/Agents/Actions";
import { PlayerConditionPool } from "~/lib/engine/core/World/Member/types/Player/Agents/Condition";
import { DefaultMemberSharedRuntime } from "~/lib/engine/core/World/Member/runtime/types";

export type MdslProfileConfig = {
	memberType: MemberType;
	actionPool: ActionPool<BtContext & Record<string, unknown>>;
	conditionPool: ConditionPool<BtContext & Record<string, unknown>>;
	propertyObject: Record<string, unknown>;
};

/**
 * 根据 MemberType 获取对应的 MDSL IntelliSense 配置
 */
export const getMdslProfileConfig = (memberType: MemberType): MdslProfileConfig => {
	switch (memberType) {
		case "Player":
			return {
				memberType: "Player",
				actionPool: {
					...CommonActionPool,
					...PlayerActionPool,
				},
				conditionPool: {
					...CommonConditionPool,
					...PlayerConditionPool,
				},
				propertyObject: {
					...DefaultMemberSharedRuntime,
				},
			};
		case "Mob":
			return {
				memberType: "Mob",
				actionPool: {
					...CommonActionPool,
					...MobActionPool,
				},
				conditionPool: {
					...CommonConditionPool,
					...MobConditionPool,
				},
				propertyObject: {
					...DefaultMemberSharedRuntime,
				},
			};
		case "Partner":
		case "Mercenary":
		default:
			// Partner/Mercenary 回退到 Common
			return {
				memberType,
				actionPool: CommonActionPool,
				conditionPool: CommonConditionPool,
				propertyObject: DefaultMemberSharedRuntime,
			};
	}
};
