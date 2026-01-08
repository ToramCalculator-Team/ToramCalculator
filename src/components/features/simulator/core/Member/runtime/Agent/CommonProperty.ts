import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { SkillEffectWithRelations } from "@db/generated/repositories/skill_effect";
import type { SkillEffectLogic } from "@db/schema/skillEffectLogicSchema";
import type { ExpressionContext } from "../../../JSProcessor/types";
import type { MemberDomainEvent } from "../../../types";
import type { DamageAreaRequest } from "../../../World/types";
import type { Member } from "../../Member";
import type { MemberEventType, MemberStateContext } from "../StateMachine/types";


export interface CommonProperty extends Record<string, unknown> {
	/** 成员引用 */
	owner: Member<string, MemberEventType, MemberStateContext, any> | undefined;
	/** 当前帧 */
	currentFrame: number;
	/** 当前帧号（由引擎注入）*/
	getCurrentFrame: () => number;
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

	/**
	 * 表达式求值（由引擎注入）
	 * - FSM / 行为树只依赖这个函数，不直接依赖 GameEngine
	 */
	expressionEvaluator: ((expression: string, context: ExpressionContext) => number | boolean) | null;
	/** 伤害请求处理器 */
	damageRequestHandler: ((damageRequest: DamageAreaRequest) => void) | null;
	/** 渲染消息发射器 */
	renderMessageSender: ((payload: unknown) => void) | null;
	/** 域事件发射器 */
	domainEventSender: ((event: MemberDomainEvent) => void) | null;
}

export const CommonProperty: CommonProperty = {
	owner: undefined,
	currentFrame: 0,
	getCurrentFrame: () => {
		throw new Error("getCurrentFrame 未注入");
	},
	position: { x: 0, y: 0, z: 0 },
	targetId: "",
	statusTags: [],
	currentSkill: null,
	currentSkillEffect: null,
	currentSkillLogic: null,
	previousSkill: null,
	vAtkP: "((self.lv - target.lv + self.atk.p) * (1 - target.red.p) - (1 - self.pie.p) * target.def.p)",
	vAtkM: "((self.lv - target.lv + self.atk.m) * (1 - target.red.m) - (1 - self.pie.m) * target.def.m)",
	expressionEvaluator: (expression: string) => {
		throw new Error(`expressionEvaluator 未注入：${expression}`);
	},
	damageRequestHandler: (damageRequest: DamageAreaRequest) => {
		throw new Error(`damageRequestHandler 未注入：${damageRequest}`);
	},
	renderMessageSender: (payload: unknown) => {
		throw new Error(`renderMessageSender 未注入：${payload}`);
	},
	domainEventSender: (event: MemberDomainEvent) => {
		throw new Error(`domainEventSender 未注入：${event}`);
	},
};
