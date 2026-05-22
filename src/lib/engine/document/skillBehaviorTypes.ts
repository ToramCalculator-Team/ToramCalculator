// 技能行为参数类型草案：承载“默认行为树模板”的表单数据。
// 本文件属于设计文档；运行时代码落地前应先把这些类型转成 Zod schema。
import type {
	AbnormalType,
	DamageRangeType,
	ElementType,
	SkillAttackType,
	SkillChargingType,
	SkillDistanceType,
} from "@db/schema/enums"; // 复用数据库枚举，避免文档类型自造第二套枚举。
import type {
	AttributeSlotDeclarationData,
	EventSubscriptionEffect,
	PipelinePatchEffect,
	SkillBranchActivatorEffect,
	ThresholdWatcherEffect,
} from "@db/schema/jsons"; // 复用托环与行为树现有 JSON 契约。
import type { ModifierSource, ModifierType } from "../core/World/Member/runtime/StatContainer/StatContainer"; // modifier 参数直接对齐 StatContainer.addModifier。

export type FormulaString = string; // 表达式字符串，例如 `50 + 5 * SLv`。

export type StatPath = string; // StatContainer 属性路径，例如 `atk`、`hp.current`、`skill.crossFire.stack`。

export type EffectScope = "self" | "target" | "party" | "enemy" | "area"; // 效果作用域，用于状态和回复目标选择。

export type RecoveryScope = "self" | "target" | "party"; // 回复目标集合，避免把区域对象混入直接回复。

export type PositionAnchor = "self" | "target" | "ground" | "direction" | "offset"; // 世界位置锚点，不包含运行时 targetId。

export type SkillExecutionKind = "Common" | "Ex"; // 技能入口类型，区分一般和系统/生产类技能。

export type SkillBehaviorKind =
	| "DamageAction" // 主动伤害流程。
	| "StatusAction" // 主动状态流程。
	| "RecoveryAction" // 主动回复流程。
	| "PassiveRule" // 战前安装的被动规则。
	| "WorldObject" // 独立世界对象流程。
	| "WorldZone" // 独立世界区域流程。
	| "CustomBehaviorTree"; // 自定义行为树逃生口。

export type AttributeSlotParam = AttributeSlotDeclarationData; // 持久化槽直接使用 `path` 作为身份，不再额外声明 slot id。

export interface StatModifierParam {
	// StatContainer.addModifier 的参数化形态。
	attr: StatPath; // 对应 addModifier 的 attr 参数。
	targetType: ModifierType; // 对应 addModifier 的 targetType 参数。
	value: FormulaString; // 求值后传给 addModifier 的 value 参数。
	source?: ModifierSource; // 对应 addModifier 的 source 参数；缺省时由模板按技能/状态来源生成。
}

export interface AilmentParam {
	// 命中时异常参数。
	type: AbnormalType; // 已枚举异常类型；导入时必须完成资料站名称到枚举的映射。
	chance: FormulaString; // 命中后判定概率公式。
}

export interface StateTimerParam {
	// 默认模板只保留计时器形态的跨帧状态。
	path: StatPath; // 计时器写入的 StatContainer 路径。
	durationMs: FormulaString; // 计时器持续时间毫秒公式。
	startedAtMsPath?: StatPath; // 需要持久化开始时间时使用的 StatContainer 路径。
	expiresAtMsPath?: StatPath; // 需要持久化结束时间时使用的 StatContainer 路径。
}

export type ProrationKind = "physical" | "magic" | "normal_attack" | "none"; // 惯性类型。

export interface DamageBehaviorParams {
	// 伤害行为模板参数。
	damageEvents: DamageEventParam[]; // 单次技能中的伤害事件列表；多段伤害拆成多个事件。
	proration: ProrationKind; // 该技能进入惯性系统的类型。
	damageApplication: SkillAttackType; // 伤害施加类型，影响 applyDamage 前后的管线输入。
	damageResolution: SkillAttackType; // 伤害结算类型，影响 hitCheck / damageCalc 的标签推导。
	followUp?: DamageFollowUpParam; // 全部伤害事件登记完成后的简单后续效果。
}

export interface DamageFollowUpParam {
	// DamageAction 保留高频且不需要流程编排的后续效果。
	statuses?: StatusBehaviorParams[]; // 伤害动作完成后施加的简单状态；命中依赖状态进入自定义行为树。
	recoveries?: RecoveryParam[]; // 伤害动作完成后的简单回复；按命中次数回复进入自定义行为树。
}

export interface DamageEventParam {
	// 单个伤害事件参数。
	identity?: DamageEventIdentityParam; // 导入追踪与 UI 展示信息。
	formula: DamageFormulaParam; // 伤害公式参数。
	delivery: DamageDeliveryParam; // 伤害范围与区域参数。
	timing?: DamageTimingParam; // 事件延迟与区域持续时间。
	ailments?: AilmentParam[]; // 命中时判定的异常列表。
}

export interface DamageEventIdentityParam {
	// 伤害事件身份参数。
	name?: string; // 伤害段名称。
	sourceBranchId?: string; // 来源分支 ID，用于导入追踪。
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
	damageFormula?: FormulaString; // 已编译的完整伤害表达式；存在时优先用于 DamageAreaRequest.payload.damageFormula。
	element?: DamageElementParam; // 伤害元素公式；damageTags 由模板根据元素与伤害类型推导。
	distanceType?: SkillDistanceType; // 距离威力类型。
}

export interface DamageTimingParam {
	// 伤害时间参数。
	startDelayMs?: FormulaString; // 登记伤害区域前等待的毫秒数。
	durationMs?: FormulaString; // 伤害区域存续时间毫秒；空值表示瞬时区域。
}

export interface AreaRehitParam {
	// 持续区域的同目标再次命中参数。
	hitIntervalMs?: FormulaString; // 同目标命中节流毫秒；生成 DamageAreaRequest.hitPolicy.hitIntervalMs。
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

export type SingleDamageRangeType = Extract<DamageRangeType, "Single" | "None">; // 单体与历史兼容单体范围。

export type RedWarningDamageRangeType = Extract<DamageRangeType, "Range" | "Enemy" | "MoveAttack" | "Line">; // 红色警告范围对应的范围类型。

export type BlueWarningDamageRangeType = Extract<
	DamageRangeType,
	"Ground" | "Bullet" | "GroundFixed" | "Meteor" | "Explosion" | "Attraction"
>; // 蓝色警告范围对应的范围类型。

export type DamageDeliveryParam =
	| SingleDamageDeliveryParam // 单体派发，模板内部写入 warningZone: "none"。
	| RedWarningDamageDeliveryParam // 红色警告范围派发，warningZone 由 rangeType 推导。
	| BlueWarningDamageDeliveryParam; // 蓝色警告范围派发，warningZone 由 rangeType 推导。

export interface SingleDamageDeliveryParam {
	// 单体伤害派发参数。
	rangeType: SingleDamageRangeType; // 单体范围类型；不暴露 targetId。
}

export type RedWarningDamageDeliveryParam =
	| {
			// 目标中心范围伤害。
			rangeType: Extract<RedWarningDamageRangeType, "Range">; // 以当前运行时目标为中心。
			rangeParams: RadiusRangeParam; // 半径与再次命中参数。
	  }
	| {
			// 自身中心周围伤害。
			rangeType: Extract<RedWarningDamageRangeType, "Enemy">; // 以施法者自身为中心。
			rangeParams: RadiusRangeParam; // 半径与再次命中参数。
	  }
	| {
			// 冲撞伤害。
			rangeType: Extract<RedWarningDamageRangeType, "MoveAttack">; // 施法者沿攻击方向移动。
			rangeParams: MoveAttackRangeParam; // 冲撞几何参数。
	  }
	| {
			// 直线伤害。
			rangeType: Extract<RedWarningDamageRangeType, "Line">; // 正面直线范围。
			rangeParams: LineRangeParam; // 直线几何参数。
	  };

export type BlueWarningDamageDeliveryParam =
	| {
			// 贴地移动伤害。
			rangeType: Extract<BlueWarningDamageRangeType, "Ground">; // 贴地路径范围。
			rangeParams: GroundRangeParam; // 贴地路径参数。
	  }
	| {
			// 投射物伤害。
			rangeType: Extract<BlueWarningDamageRangeType, "Bullet">; // 球状投射物范围。
			rangeParams: BulletRangeParam; // 投射物参数。
	  }
	| {
			// 固定地面伤害。
			rangeType: Extract<BlueWarningDamageRangeType, "GroundFixed">; // 固定地面领域。
			rangeParams: GroundFixedRangeParam; // 领域参数。
	  }
	| {
			// 陨石伤害。
			rangeType: Extract<BlueWarningDamageRangeType, "Meteor">; // 空中落下范围。
			rangeParams: MeteorRangeParam; // 陨石落点参数。
	  }
	| {
			// 爆炸伤害。
			rangeType: Extract<BlueWarningDamageRangeType, "Explosion">; // 延迟爆炸范围。
			rangeParams: ExplosionRangeParam; // 爆炸参数。
	  }
	| {
			// 吸引伤害。
			rangeType: Extract<BlueWarningDamageRangeType, "Attraction">; // 持续吸引领域。
			rangeParams: AttractionRangeParam; // 吸引领域参数。
	  };

export interface StatusBehaviorParams {
	// 状态行为模板参数。
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

export interface RecoveryBehaviorParams {
	// 回复行为模板参数。
	recoveries: RecoveryParam[]; // 回复段列表。
}

export interface RecoveryParam {
	// 单个回复段参数。
	resource: "hp" | "mp"; // 回复资源。
	scope: RecoveryScope; // 回复对象。
	amount: FormulaString; // 回复量公式；固定量与额外量都合并到同一个公式。
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
	// 被动规则模板参数，复用 RuntimeAttachment / 托环安装契约。
	attributeSlots?: AttributeSlotParam[]; // 战前并入 StatContainer 的持久化属性槽。
	modifiers: StatModifierParam[]; // 战前安装的常驻 modifier。
	pipelinePatches?: PipelinePatchEffect[]; // 高级：挂入公开 pipeline slot 的 overlay。
	subscriptions?: EventSubscriptionEffect[]; // 高级：订阅 ProcBus 事件并执行现有 handler。
	thresholdWatchers?: ThresholdWatcherEffect[]; // 高级：订阅 StatContainer 阈值跨越事件。
	skillBranchActivators?: SkillBranchActivatorEffect[]; // 高级：为技能行为树打开既有分支。
}

export interface WorldObjectBehaviorParams {
	// 独立世界对象模板参数。
	objectKind: "summon" | "trap" | "clone"; // 对象类型。
	spawnAt: PositionAnchor; // 生成位置锚点。
	durationMs?: FormulaString; // 对象存续时间毫秒。
	objectBehaviorTreeId?: string; // 对象内部行为超出默认模板时关联的自定义行为树。
}

export interface WorldZoneBehaviorParams {
	// 独立世界区域模板参数。
	zoneKind: "buffZone" | "debuffZone" | "trapZone" | "field"; // 区域类型。
	center: PositionAnchor; // 区域中心锚点。
	radius: FormulaString; // 区域半径公式。
	durationMs: FormulaString; // 区域存续时间毫秒。
	tickIntervalMs?: FormulaString; // 区域周期检查间隔毫秒。
	zoneBehaviorTreeId?: string; // 区域效果超出默认模板时关联的自定义行为树。
}

export interface CustomBehaviorTreeParams {
	// 自定义行为树模板参数。
	exposedParams?: Record<string, unknown>; // 自定义行为树暴露给表单的参数。
}

export type SkillBehaviorParams =
	| DamageBehaviorParams // 伤害行为参数。
	| StatusBehaviorParams // 状态行为参数。
	| RecoveryBehaviorParams // 回复行为参数。
	| PassiveRuleParams // 被动规则参数。
	| WorldObjectBehaviorParams // 世界对象参数。
	| WorldZoneBehaviorParams // 世界区域参数。
	| CustomBehaviorTreeParams; // 自定义行为树参数。

export interface SkillVariantRuntimeShape {
	// `skill_variant` 推荐运行时形状。
	executionKind: SkillExecutionKind; // 技能入口类型。
	chargingType: SkillChargingType; // 技能读条类型，复用 SkillChargingType。
	behaviorKind: SkillBehaviorKind; // 行为模板类型。
	behaviorParams: SkillBehaviorParams; // 行为模板参数。
	customBehaviorTreeId?: string; // 自定义行为树 ID。
}
