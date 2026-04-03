import type { MemberType } from "@db/schema/enums";
import { MemberContext } from "~/lib/engine/core/World/Member/MemberContext";
import { CommonActionPool } from "~/lib/engine/core/World/Member/runtime/Agent/CommonActions";
import { CommonConditionPool } from "~/lib/engine/core/World/Member/runtime/Agent/CommonCondition";
import type { ActionPool, ConditionPool } from "~/lib/engine/core/World/Member/runtime/Agent/type";
import { MobActionPool } from "~/lib/engine/core/World/Member/types/Mob/Agents/Actions";
import { MobConditionPool } from "~/lib/engine/core/World/Member/types/Mob/Agents/Condition";
import { MobContext } from "~/lib/engine/core/World/Member/types/Mob/Agents/Context";
import { PlayerActionPool } from "~/lib/engine/core/World/Member/types/Player/Agents/Actions";
import { PlayerConditionPool } from "~/lib/engine/core/World/Member/types/Player/Agents/Condition";
import { PlayerContext } from "~/lib/engine/core/World/Member/types/Player/Agents/Context";

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
					...MemberContext,
					...PlayerContext,
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
					...MemberContext,
					...MobContext,
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
				propertyObject: MemberContext,
			};
	}
};
