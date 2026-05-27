// 技能行为参数类型草案：描述 skill_variant 三组默认 DSL 与外层 behavior_tree 关系。
// 本文件属于设计文档；数据库校验以 db/schema/jsons.ts 为准，运行时精确校验由对应组件负责。
import type { AbnormalType, DamageRangeType, ElementType, SkillAttackType } from "@db/schema/enums"; // 复用数据库游戏内容枚举。
import type {
	AttributeSlotDeclarationData,
	EventSubscriptionEffect,
	PipelinePatchEffect,
	SkillBranchActivatorEffect,
	ThresholdWatcherEffect,
} from "@db/schema/jsons"; // 复用已存在的数据库 JSON 契约。
import type { StatModifierParam } from "../core/World/Member/runtime/StatContainer/StatContainer"; // modifier 的精确结构由 StatContainer 运行时决定。

export type FormulaString = string; // 表达式字符串，例如 `50 + 5 * skillLv`。

export type StatPath = string; // StatContainer 属性路径，例如 `atk.p`、`hp.current`、`skill.magicCannon.charge`。

export type EffectScope = "self" | "target" | "party" | "enemy" | "area"; // 效果作用域，用于状态和回复目标选择。

export type RecoveryScope = "self" | "target" | "party"; // 回复目标集合，避免把区域对象混入直接回复。

export type PositionAnchor = "self" | "target" | "ground" | "direction" | "offset"; // 世界位置锚点，不包含运行时 targetId。

export type SkillBehaviorSlot = "active" | "passive" | "registered"; // skill_variant 顶层行为槽；分类信息不下放到 behavior_tree。

export type ActiveSkillBehaviorKind =
	| "DamageAction" // 主动伤害流程。
	| "StatusAction" // 主动状态流程。
	| "RecoveryAction" // 主动回复流程。
	| "WorldObject" // 主动创建世界对象。
	| "WorldZone"; // 主动创建世界区域。

export type PassiveSkillBehaviorKind = "PassiveRule"; // 成员创建时安装的被动规则。

export type RegisteredSkillBehaviorKind = "RegisteredAction"; // 生命周期超过本次释放的长期注册默认行为。

export type SkillBehaviorKind = ActiveSkillBehaviorKind | PassiveSkillBehaviorKind | RegisteredSkillBehaviorKind; // 对齐 db/schema/enums.ts 的 SKILL_BEHAVIOR_KIND。

export type AttributeSlotParam = AttributeSlotDeclarationData; // 持久化槽直接使用 path 作为身份，不额外声明 slot id。

export interface BehaviorTreeResource {
	// behavior_tree 表的数据形状；归属关系由 skill_variant 顶层 relation 决定。
	id: string; // 行为树资源 ID。
	name: string; // 行为树名称，用于 UI 与 BtManager 注册名。
	definition: string; // MDSL 行为树源码。
	agent: string; // 行为树可调用函数集源码。
	attributeSlots: AttributeSlotParam[]; // 行为树需要并入 StatContainer 的持久化属性槽。
}

export interface SkillBehaviorLifecycleParam {
	// 主动技能释放生命周期；从旧 skill_variant 时间字段迁入 activeBehavior.behaviorParams.lifecycle。
	startupMs: FormulaString; // 前摇时间公式，进入 skill.startup 管线。
	actionFixedMs: FormulaString; // 固定动作时间公式，不受行动速度影响。
	actionModifiedMs: FormulaString; // 可修正动作时间公式，进入 skill.action 管线。
	chantingFixedMs: FormulaString; // 固定咏唱时间公式，不受速度影响。
	chantingModifiedMs: FormulaString; // 可修正咏唱时间公式，进入 skill.chanting 管线。
	chargingFixedMs: FormulaString; // 固定蓄力时间公式，不受速度影响。
	chargingModifiedMs: FormulaString; // 可修正蓄力时间公式，进入 skill.charging 管线。
	targeting: SkillBehaviorTargetingParam; // 释放入口层面的目标选择参数。
}

export interface SkillBehaviorTargetingParam {
	// 释放入口目标参数；运行时 targetId 由玩家状态机与区域系统提供。
	castingRange: FormulaString; // 释放距离公式，旧 castingRange 迁入此处。
}

export interface SkillBehaviorBase<TKind extends SkillBehaviorKind, TParams> {
	// 默认行为 DSL 的顶层形状；JSON 内不保存 behaviorTreeId。
	behaviorKind: TKind; // 默认行为模板类型。
	behaviorParams: TParams; // 对应模板参数。
	attributeSlots?: AttributeSlotParam[]; // DSL 自身需要的持久化槽。
}

export type ProrationKind = "physical" | "magic" | "normal_attack" | "none"; // 惯性类型。

export interface DamageActionParams {
	// 伤害行为模板参数。
	lifecycle: SkillBehaviorLifecycleParam; // 主动释放生命周期。
	damageEvents: DamageEventParam[]; // 单次技能中的伤害事件列表；多段伤害拆成多个事件。
	proration?: ProrationKind; // 该技能进入惯性系统的类型；缺省时由导入资料或模板推导。
	damageApplication?: SkillAttackType; // 伤害施加类型，影响 applyDamage 前后的管线输入。
	damageResolution?: SkillAttackType; // 伤害结算类型，影响 hitCheck / damageCalc 的标签推导。
	rawBranches?: unknown[]; // 导入保真字段，供低置信度复核。
}

export interface DamageEventParam {
	// 单个伤害事件参数；每个事件独立创建 DamageAreaRequest 并独立命中判定。
	name?: string; // 伤害段名称。
	formula: DamageFormulaParam; // 伤害公式参数。
	delivery: DamageDeliveryParam; // 伤害范围与区域参数。
	timing?: DamageTimingParam; // 事件延迟与区域持续时间。
	ailments?: AilmentParam[]; // 命中时判定的异常列表。
	rawBranch?: unknown; // 来源分支保真信息。
}

export interface DamageElementParam {
	// 伤害元素表达式。
	expression: FormulaString; // 求值结果应为 ElementType，例如 `"Fire"`、`self.mainWeapon.element`、`self.subWeapon.element`。
	fallback?: ElementType; // 表达式无法求值时的兜底元素。
}

export interface DamageFormulaParam {
	// 伤害公式参数。
	constant?: FormulaString; // 技能常数公式。
	multiplier: FormulaString; // 技能倍率公式。
	base?: FormulaString; // 基础攻击来源，例如 atk.p / atk.m / 自定义表达式。
	damageFormula?: FormulaString; // 已编译的完整伤害表达式；存在时优先用于 DamageAreaRequest.payload.damageFormula。
	element: DamageElementParam; // 伤害元素公式；damageTags 由模板根据元素与伤害类型推导。
	damageType?: SkillAttackType; // 资料导入的伤害类型线索。
}

export interface DamageDeliveryParam {
	// 伤害投递参数；warningZone 与 rangeType 绑定，单体技能没有 warningZone。
	rangeType: DamageRangeType; // 对齐 db/schema/enums.ts 的 DAMAGE_RANGE_TYPE。
	effectiveRange: FormulaString; // 具体伤害事件有效范围，旧 effectiveRange 迁入此处。
	rangeParams?: DamageRangeParam; // 非单体范围的几何参数。
}

export type DamageRangeParam =
	| RadiusRangeParam // 圆形范围。
	| MoveAttackRangeParam // 冲撞范围。
	| LineRangeParam // 直线范围。
	| GroundRangeParam // 贴地路径范围。
	| BulletRangeParam // 投射物范围。
	| GroundFixedRangeParam // 固定地面领域。
	| MeteorRangeParam // 陨石范围。
	| ExplosionRangeParam // 爆炸范围。
	| AttractionRangeParam; // 吸引领域。

export interface AreaRehitParam {
	// 持续区域的同目标再次命中参数。
	hitIntervalMs?: FormulaString; // 同目标命中节流毫秒；由区域系统解释。
}

export interface RadiusRangeParam extends AreaRehitParam {
	// 半径范围参数。
	radius: FormulaString; // 半径公式。
}

export interface MoveAttackRangeParam extends AreaRehitParam {
	// 冲撞范围参数。
	moveDistance: FormulaString; // 移动距离公式。
	width: FormulaString; // 判定宽度公式。
	speed?: FormulaString; // 移动速度公式。
	canBeBlocked?: boolean; // 是否会被阻挡。
}

export interface LineRangeParam extends AreaRehitParam {
	// 直线范围参数。
	length: FormulaString; // 直线长度公式。
	width: FormulaString; // 直线宽度公式。
}

export interface GroundRangeParam extends AreaRehitParam {
	// 贴地路径范围参数。
	pathKind: "line" | "fan" | "multiLine" | "custom"; // 路径形状。
	count?: FormulaString; // 路径数量公式。
	speed: FormulaString; // 路径速度公式。
	width: FormulaString; // 路径宽度公式。
}

export interface BulletRangeParam extends AreaRehitParam {
	// 投射物范围参数。
	radius: FormulaString; // 投射物半径公式。
	speed: FormulaString; // 投射物速度公式。
	pathHit?: boolean; // 路径中是否命中。
	impactHit?: boolean; // 着弹点是否命中。
}

export interface GroundFixedRangeParam extends AreaRehitParam {
	// 固定地面领域范围参数。
	position: Extract<PositionAnchor, "self" | "target" | "ground">; // 领域中心来源。
	radius: FormulaString; // 领域半径公式。
}

export interface MeteorRangeParam extends AreaRehitParam {
	// 陨石范围参数。
	position: Extract<PositionAnchor, "target" | "ground">; // 落点来源。
	radius: FormulaString; // 落点半径公式。
}

export interface ExplosionRangeParam extends AreaRehitParam {
	// 爆炸范围参数。
	position: Extract<PositionAnchor, "target" | "ground">; // 爆炸中心来源。
	radius: FormulaString; // 爆炸半径公式。
}

export interface AttractionRangeParam extends AreaRehitParam {
	// 吸引领域范围参数。
	position: Extract<PositionAnchor, "target" | "ground">; // 领域中心来源。
	radius: FormulaString; // 领域半径公式。
	pullStrength: FormulaString; // 吸引强度公式。
}

export interface DamageTimingParam {
	// 伤害时间参数；周期、条件续发和循环插入进入自定义行为树。
	delayMs: FormulaString; // 登记伤害区域前等待的毫秒数。
	durationMs?: FormulaString; // 伤害区域存续时间毫秒；空值表示瞬时区域。
	intervalMs?: FormulaString; // 区域周期检查间隔，由区域系统解释。
	repeatCount?: FormulaString; // 简单固定次数；复杂终止条件进入自定义行为树。
}

export interface AilmentParam {
	// 命中时异常参数。
	type: AbnormalType; // 已枚举异常类型；导入时必须完成资料站名称到枚举的映射。
	probability: FormulaString; // 命中后判定概率公式。
	durationMs?: FormulaString; // 异常持续时间毫秒。
}

export interface StatusActionParams {
	// 主动状态行为模板参数。
	lifecycle: SkillBehaviorLifecycleParam; // 主动释放生命周期。
	effects: StatusEffectParam[]; // 状态效果列表。
	rawBranches?: unknown[]; // 导入保真字段，供低置信度复核。
}

export interface StatusEffectParam {
	// 状态安装参数。
	scope: EffectScope; // 状态接收者集合。
	modifiers: StatModifierParam[]; // 状态安装到接收者 StatContainer 的 modifier 列表。
	durationMs?: FormulaString; // modifier 存续时间毫秒；空值表示由状态管理器或来源生命周期控制。
	aura?: AuraParam; // 需要按半径持续影响对象时使用光环参数。
}

export interface AuraParam {
	// 光环参数。
	radius: FormulaString; // 光环半径公式。
	scope: "party" | "enemy" | "all"; // 光环影响对象集合。
	durationMs?: FormulaString; // 光环存续时间毫秒。
	refreshIntervalMs?: FormulaString; // 光环刷新周期毫秒。
}

export interface RecoveryActionParams {
	// 主动回复行为模板参数。
	lifecycle: SkillBehaviorLifecycleParam; // 主动释放生命周期。
	recoveries: RecoveryParam[]; // 回复段列表。
	rawBranches?: unknown[]; // 导入保真字段，供低置信度复核。
}

export interface RecoveryParam {
	// 单个回复段参数。
	resource: "hp" | "mp"; // 回复资源。
	scope: RecoveryScope; // 回复对象。
	amount: FormulaString; // 回复量公式；固定量与额外量合并到同一个公式。
	schedule?: RecoveryScheduleParam; // 回复调度；空值表示立即回复。
}

export type RecoveryScheduleParam =
	| {
			// 立即回复。
			kind: "Immediate"; // 立即执行一次。
	  }
	| {
			// 周期回复。
			kind: "Periodic"; // 按固定间隔执行。
			durationMs: FormulaString; // 周期回复总持续时间毫秒。
			intervalMs: FormulaString; // 周期回复间隔毫秒。
	  };

export interface PassiveRuleParams {
	// 被动规则模板参数，成员创建时安装。
	attributeSlots?: AttributeSlotParam[]; // 战前并入 StatContainer 的持久化属性槽。
	modifiers?: StatModifierParam[]; // 战前安装的常驻 modifier；运行时用 StatContainer schema 校验。
	pipelinePatches?: PipelinePatchEffect[]; // 高级：挂入公开 pipeline slot 的 overlay。
	subscriptions?: EventSubscriptionEffect[]; // 高级：订阅 ProcBus 事件并执行现有 handler。
	thresholdWatchers?: ThresholdWatcherEffect[]; // 高级：订阅 StatContainer 阈值跨越事件。
	skillBranchActivators?: SkillBranchActivatorEffect[]; // 高级：为技能行为树打开既有分支。
	rawBranches?: unknown[]; // 导入保真字段，供低置信度复核。
}

export interface WorldObjectActionParams {
	// 独立世界对象模板参数。
	lifecycle: SkillBehaviorLifecycleParam; // 主动释放生命周期。
	objectKind: "summon" | "trap" | "clone"; // 对象类型。
	spawnAt: PositionAnchor; // 生成位置锚点。
	durationMs?: FormulaString; // 对象存续时间毫秒。
	rawBranches?: unknown[]; // 导入保真字段，供低置信度复核。
}

export interface WorldZoneActionParams {
	// 独立世界区域模板参数。
	lifecycle: SkillBehaviorLifecycleParam; // 主动释放生命周期。
	zoneKind: "buffZone" | "debuffZone" | "trapZone" | "field"; // 区域类型。
	center: PositionAnchor; // 区域中心锚点。
	radius: FormulaString; // 区域半径公式。
	durationMs: FormulaString; // 区域存续时间毫秒。
	tickIntervalMs?: FormulaString; // 区域周期检查间隔毫秒。
	rawBranches?: unknown[]; // 导入保真字段，供低置信度复核。
}

export interface RegisteredActionParams {
	// 长期注册默认行为参数；用于能结构化且生命周期超过本次释放的逻辑。
	attributeSlots?: AttributeSlotParam[]; // 长期行为需要的持久化槽。
	rawBranches?: unknown[]; // 导入保真字段，供低置信度复核。
}

export type ActiveSkillBehavior =
	| SkillBehaviorBase<"DamageAction", DamageActionParams>
	| SkillBehaviorBase<"StatusAction", StatusActionParams>
	| SkillBehaviorBase<"RecoveryAction", RecoveryActionParams>
	| SkillBehaviorBase<"WorldObject", WorldObjectActionParams>
	| SkillBehaviorBase<"WorldZone", WorldZoneActionParams>; // activeBehavior 允许的默认 DSL。

export type PassiveSkillBehavior = SkillBehaviorBase<"PassiveRule", PassiveRuleParams>; // passiveBehavior 数组项。

export type RegisteredSkillBehavior = SkillBehaviorBase<"RegisteredAction", RegisteredActionParams>; // registeredBehavior 数组项。

export interface SkillVariantRuntimeShape {
	// skill_variant 当前推荐运行时形状；Ex 技能配置本轮不建模。
	id: string; // 技能变体 ID。
	targetMainWeaponType: string; // 主手限制，数据库层复用 MAIN_HAND_TYPE_LIMIT 字符串。
	targetSubWeaponType: string; // 副手限制，数据库层复用 SUB_HAND_TYPE_LIMIT 字符串。
	targetArmorAbilityType: string; // 防具限制，数据库层复用 PLAYER_ARMOR_ABILITY_TYPE_LIMIT 字符串。
	hpCost?: FormulaString | null; // 玩家状态机的技能释放 HP 门槛。
	mpCost?: FormulaString | null; // 玩家状态机的技能释放 MP 门槛。
	description: string; // 技能变体展示说明。
	activeBehavior?: ActiveSkillBehavior | null; // 主动释放默认 DSL；最多一个。
	passiveBehavior: PassiveSkillBehavior[]; // 成员创建时安装的默认被动 DSL。
	registeredBehavior: RegisteredSkillBehavior[]; // 生命周期超过本次释放的长期注册默认 DSL。
	activeBehaviorTree?: BehaviorTreeResource | null; // 自定义主动行为树；存在时主动释放执行它。
	passiveBehaviorTree?: BehaviorTreeResource | null; // 自定义被动行为树；成员创建时启动。
	registeredBehaviorTrees: BehaviorTreeResource[]; // 长期注册行为树资源；可多棵。
	details?: string | null; // 导入保真与低置信度信息。
	belongToskillId: string; // 所属 skill ID。
}

export interface SkillBehaviorMdslTemplate {
	// 内置默认 MDSL 模板；模板属于技能行为类型声明的附属内容，不写入 behavior_tree 表。
	behaviorKind: SkillBehaviorKind; // 由 behaviorKind 选择模板。
	slot: SkillBehaviorSlot; // 模板所属行为槽。
	definition: string; // MDSL 流程骨架；技能数据由 behaviorParams 注入 Agent。
}

export const SkillBehaviorMdslTemplates = {
	DamageAction: {
		behaviorKind: "DamageAction",
		slot: "active",
		definition: `
root {
  sequence {
    action [skillBehaviorPrepareActiveLifecycle]
    action [skillBehaviorRunActiveBeforeBody]
    action [skillBehaviorDispatchDamageEvents]
    action [skillBehaviorRunActiveAfterBody]
    action [skillBehaviorFinishActiveSkill]
  }
}
`,
	},
	StatusAction: {
		behaviorKind: "StatusAction",
		slot: "active",
		definition: `
root {
  sequence {
    action [skillBehaviorPrepareActiveLifecycle]
    action [skillBehaviorRunActiveBeforeBody]
    action [skillBehaviorApplyStatusEffects]
    action [skillBehaviorRunActiveAfterBody]
    action [skillBehaviorFinishActiveSkill]
  }
}
`,
	},
	RecoveryAction: {
		behaviorKind: "RecoveryAction",
		slot: "active",
		definition: `
root {
  sequence {
    action [skillBehaviorPrepareActiveLifecycle]
    action [skillBehaviorRunActiveBeforeBody]
    action [skillBehaviorApplyRecoveries]
    action [skillBehaviorRunActiveAfterBody]
    action [skillBehaviorFinishActiveSkill]
  }
}
`,
	},
	PassiveRule: {
		behaviorKind: "PassiveRule",
		slot: "passive",
		definition: `
root {
  sequence {
    action [skillBehaviorInstallPassiveRule]
  }
}
`,
	},
	WorldObject: {
		behaviorKind: "WorldObject",
		slot: "active",
		definition: `
root {
  sequence {
    action [skillBehaviorPrepareActiveLifecycle]
    action [skillBehaviorRunActiveBeforeBody]
    action [skillBehaviorSpawnWorldObject]
    action [skillBehaviorRunActiveAfterBody]
    action [skillBehaviorFinishActiveSkill]
  }
}
`,
	},
	WorldZone: {
		behaviorKind: "WorldZone",
		slot: "active",
		definition: `
root {
  sequence {
    action [skillBehaviorPrepareActiveLifecycle]
    action [skillBehaviorRunActiveBeforeBody]
    action [skillBehaviorRegisterWorldZone]
    action [skillBehaviorRunActiveAfterBody]
    action [skillBehaviorFinishActiveSkill]
  }
}
`,
	},
	RegisteredAction: {
		behaviorKind: "RegisteredAction",
		slot: "registered",
		definition: `
root {
  sequence {
    action [skillBehaviorRegisterLongRunningAction]
  }
}
`,
	},
} satisfies Record<SkillBehaviorKind, SkillBehaviorMdslTemplate>;

export function getSkillBehaviorMdslTemplate(
	behaviorKind: SkillBehaviorKind | null | undefined,
	slot?: SkillBehaviorSlot,
): SkillBehaviorMdslTemplate | null {
	if (!behaviorKind || !(behaviorKind in SkillBehaviorMdslTemplates)) {
		return null;
	}
	const template = SkillBehaviorMdslTemplates[behaviorKind];
	if (slot && template.slot !== slot) {
		return null;
	}
	return template;
}
