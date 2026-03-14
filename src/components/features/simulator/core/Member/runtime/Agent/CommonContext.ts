import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { SkillVariantWithRelations } from "@db/generated/repositories/skill_variant";
import type { MemberBTTree } from "@db/schema/jsons";
import type { Member } from "../../Member";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";
import type { MemberRuntimeServices } from "./RuntimeServices";
import { MemberRuntimeServicesDefaults } from "./RuntimeServices";


/**
 * 成员共享运行时上下文。
 *
 * 当前它仍同时承载：
 * - 共享运行时状态
 * - 引擎注入服务
 *
 * 这是一个过渡层，后续会继续拆分为 runtime state 与 runtime services。
 */
export interface CommonContext extends Record<string, unknown>, MemberRuntimeServices {
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
	currentSkillVariant: SkillVariantWithRelations | null;
	/** 当前技能主动效果行为树 */
	currentSkillActiveEffectLogic: MemberBTTree | null;

	// 每次技能执行完更新
	/** 上一个技能数据 */
	previousSkill: CharacterSkillWithRelations | null;

	// 常用计算值
	vAtkP: string;
	vAtkM: string;
}

export const CommonContext: CommonContext = {
	...MemberRuntimeServicesDefaults,
	owner: undefined,
	currentFrame: 0,
	position: { x: 0, y: 0, z: 0 },
	targetId: "",
	statusTags: [],
	currentSkill: null,
	currentSkillVariant: null,
	currentSkillActiveEffectLogic: null,
	previousSkill: null,
	vAtkP: "((self.lv - target.lv + self.atk.p) * (1 - target.red.p) - (1 - self.pie.p) * target.def.p)",
	vAtkM: "((self.lv - target.lv + self.atk.m) * (1 - target.red.m) - (1 - self.pie.m) * target.def.m)",
};

/** 兼容命名：共享 runtime state + services 的合并视图。 */
export type MemberSharedRuntimeState = CommonContext;
