import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { SkillEffectWithRelations } from "@db/generated/repositories/skill_effect";
import type { SkillEffectLogic } from "@db/schema/skillEffectLogicSchema";
import type { Member } from "../../Member";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";
import type { RuntimeContext } from "./RuntimeContext";


export interface CommonProperty {
	/** 成员引用 */
	owner: Member<string, MemberEventType, MemberStateContext, any> | undefined;
	/** 当前帧 */
	currentFrame: number;
	/** 位置信息 */
	position: { x: number; y: number; z: number };
	/** 成员目标ID */
	targetId: string;
	/** 状态标签组 */
	statusTags: string[];

	// 每次技能执行完重置
	/** 当前技能数据 */
	currentSkill: CharacterSkillWithRelations | null;
	/** 当前技能效果 */
	currentSkillEffect: SkillEffectWithRelations | null;
	/** 当前技能逻辑 */
	currentSkillLogic: SkillEffectLogic | null;

	// 每次技能执行完更新
	/** 上一个技能数据 */
	previousSkill: CharacterSkillWithRelations | null;

	// 常用计算值
	vAtkP: string;
	vAtkM: string;
}

export const CommonProperty: CommonProperty = {
	owner: undefined,
	currentFrame: 0,
	position: { x: 0, y: 0, z: 0 },
	targetId: "",
	statusTags: [],
	currentSkill: null,
	currentSkillEffect: null,
	currentSkillLogic: null,
	previousSkill: null,
	vAtkP: "((self.lv - target.lv + self.atk.p) * (1 - target.red.p) - (1 - self.pie.p) * target.def.p)",
	vAtkM: "((self.lv - target.lv + self.atk.m) * (1 - target.red.m) - (1 - self.pie.m) * target.def.m)",
};
