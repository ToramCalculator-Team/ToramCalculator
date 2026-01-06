import type { MemberType } from "@db/schema/enums";
import { CommonActionPool } from "~/components/features/simulator/core/Member/runtime/Agent/CommonActions";
import { CommonConditionPool } from "~/components/features/simulator/core/Member/runtime/Agent/CommonCondition";
import { CommonProperty } from "~/components/features/simulator/core/Member/runtime/Agent/CommonProperty";
import type { ActionPool, ConditionPool } from "~/components/features/simulator/core/Member/runtime/Agent/type";
import { MobActionPool } from "~/components/features/simulator/core/Member/types/Mob/Agents/Actions";
import { MobConditionPool } from "~/components/features/simulator/core/Member/types/Mob/Agents/Condition";
import { MobProperty } from "~/components/features/simulator/core/Member/types/Mob/Agents/Property";
import { PlayerActionPool } from "~/components/features/simulator/core/Member/types/Player/Agents/Actions";
import { PlayerConditionPool } from "~/components/features/simulator/core/Member/types/Player/Agents/Condition";
import { PlayerProperty } from "~/components/features/simulator/core/Member/types/Player/Agents/Property";

export type MdslProfileConfig = {
	memberType: MemberType;
	actionPool: ActionPool<any>;
	conditionPool: ConditionPool<any>;
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
					...CommonProperty,
					...PlayerProperty,
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
					...CommonProperty,
					...MobProperty,
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
				propertyObject: CommonProperty,
			};
	}
};
