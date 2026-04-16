import type { MemberType } from "@db/schema/enums";
import { CommonActionPool } from "~/lib/engine/core/World/Member/runtime/Agent/CommonActions";
import { CommonConditionPool } from "~/lib/engine/core/World/Member/runtime/Agent/CommonCondition";
import type { BtContext } from "~/lib/engine/core/World/Member/runtime/Agent/BtContext";
import type { ActionPool, ConditionPool } from "~/lib/engine/core/World/Member/runtime/Agent/type";
import { MobActionPool } from "~/lib/engine/core/World/Member/types/Mob/Agents/Actions";
import { MobConditionPool } from "~/lib/engine/core/World/Member/types/Mob/Agents/Condition";
import { PlayerActionPool } from "~/lib/engine/core/World/Member/types/Player/Agents/Actions";
import { PlayerConditionPool } from "~/lib/engine/core/World/Member/types/Player/Agents/Condition";

const MemberRuntimeShape = {
	currentFrame: 0,
	position: { x: 0, y: 0, z: 0 },
	targetId: "",
	statusTags: [] as string[],
	currentSkill: null as unknown,
	previousSkill: null as unknown,
	currentSkillVariant: null as unknown,
	currentSkillParams: {} as Record<string, number>,
	currentSkillStartupFrames: 0,
	currentSkillChargingFrames: 0,
	currentSkillChantingFrames: 0,
	currentSkillActionFrames: 0,
};

const PlayerRuntimeShape = {
	...MemberRuntimeShape,
	type: "Player" as const,
	skillList: [] as unknown[],
	skillCooldowns: [] as number[],
	character: null as unknown,
};

const MobRuntimeShape = {
	...MemberRuntimeShape,
	type: "Mob" as const,
	skillList: [] as unknown[],
	skillCooldowns: [] as number[],
	character: null as unknown,
};

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
					...PlayerRuntimeShape,
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
					...MobRuntimeShape,
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
				propertyObject: MemberRuntimeShape,
			};
	}
};
