import type { MemberType } from "@db/schema/enums";
import { CommonActionPool } from "~/lib/engine/core/World/Member/runtime/Agent/CommonActions";
import { CommonConditionPool } from "~/lib/engine/core/World/Member/runtime/Agent/CommonCondition";
import { DefaultMemberSharedRuntime } from "~/lib/engine/core/World/Member/runtime/types";
import { MobActionPool } from "~/lib/engine/core/World/Member/types/Mob/Agents/Actions";
import { MobConditionPool } from "~/lib/engine/core/World/Member/types/Mob/Agents/Condition";
import { PlayerActionPool } from "~/lib/engine/core/World/Member/types/Player/Agents/Actions";
import { PlayerConditionPool } from "~/lib/engine/core/World/Member/types/Player/Agents/Condition";
import type { MdslCallablePool } from "./mdslIntellisense";

export type MdslProfileConfig = {
	memberType: MemberType;
	actionPool: MdslCallablePool;
	conditionPool: MdslCallablePool;
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
