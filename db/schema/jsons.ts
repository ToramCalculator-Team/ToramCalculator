/**
 * @file jsons.ts
 * @description Json 定义文件
 *
 * 此文件主要用于定义数据库中出现的 Json 类型，生成器会将这里的内容补充到生成的zod/index.ts文件中。
 */
import { z } from "zod/v4";
import { MEMBER_TYPE } from "./enums";

// StatContainer 可合并的属性定义，字段形状需与 SchemaAttribute 保持一致。
export const SchemaAttributeSchema = z.object({
	// 属性展示名，主要用于调试与 UI 展示。
	displayName: z.string(),
	// 属性初始表达式，通常是 "0"、"-Infinity" 等常量。
	expression: z.string(),
	// 百分比修正不参与乘法，仅做加法累加。
	noBaseValue: z.boolean().optional(),
	// 仅保留基础值，适合技能计数器、冷却时间戳等持久化槽。
	onlyBaseValue: z.boolean().optional(),
});
export type SchemaAttributeData = z.output<typeof SchemaAttributeSchema>;

// 行为树声明的持久化属性槽；跨帧变量必须写入 StatContainer。
export const AttributeSlotDeclarationSchema = z.object({
	// 点号分隔的完整属性路径，前缀由 SchemaMerge 统一校验。
	path: z.string(),
	attribute: SchemaAttributeSchema,
});
export type AttributeSlotDeclarationData = z.output<typeof AttributeSlotDeclarationSchema>;

// 行为树或行为 DSL 声明的属性槽列表；默认空数组用于兼容无槽技能。
export const AttributeSlotDeclarationListSchema = z.array(AttributeSlotDeclarationSchema).default([]);
export type AttributeSlotDeclarationListData = z.output<typeof AttributeSlotDeclarationListSchema>;

// 技能释放生命周期参数；从旧 skill_variant 时间字段迁入。
export const SkillBehaviorLifecycleSchema = z
	.object({
		// 前摇生效点；由 skill.startup pipeline 修正。
		startupMs: z.string().default("0"),
		// 固定动作时间，不受行动速度影响。
		actionFixedMs: z.string().default("0"),
		// 可修正动作时间，进入 skill.action pipeline。
		actionModifiedMs: z.string().default("0"),
		// 固定咏唱时间，不受速度影响。
		chantingFixedMs: z.string().default("0"),
		// 可修正咏唱时间，进入 skill.chanting pipeline。
		chantingModifiedMs: z.string().default("0"),
		// 固定蓄力时间，不受速度影响。
		chargingFixedMs: z.string().default("0"),
		// 可修正蓄力时间，进入 skill.charging pipeline。
		chargingModifiedMs: z.string().default("0"),
		// 释放入口层面的锁定与寻敌参数。
		targeting: z
			.object({
				// 释放距离，旧 castingRange 迁入此处。
				castingRange: z.string().default("0"),
			})
			.default({ castingRange: "0" }),
	})
	.default({
		startupMs: "0",
		actionFixedMs: "0",
		actionModifiedMs: "0",
		chantingFixedMs: "0",
		chantingModifiedMs: "0",
		chargingFixedMs: "0",
		chargingModifiedMs: "0",
		targeting: { castingRange: "0" },
	});
export type SkillBehaviorLifecycleData = z.output<typeof SkillBehaviorLifecycleSchema>;

// 伤害元素公式；旧 elementLogic 迁入 expression。
export const DamageElementFormulaParamSchema = z.object({
	expression: z.string().default("self.mainWeapon.element"),
});
export type DamageElementFormulaParamData = z.output<typeof DamageElementFormulaParamSchema>;

// 单次伤害事件的公式参数。
export const DamageFormulaParamSchema = z.object({
	// 固定值公式，默认 0。
	constant: z.string().default("0"),
	// 倍率公式，默认 100。
	multiplier: z.string().default("100"),
	// 基础攻击来源，例如 atk.p / atk.m / 自定义表达式。
	base: z.string().optional(),
	// 元素来源可为主手、副手或技能内建表达式。
	element: DamageElementFormulaParamSchema.default({ expression: "self.mainWeapon.element" }),
});
export type DamageFormulaParamData = z.output<typeof DamageFormulaParamSchema>;

// 伤害投递与范围参数；warningZone 只随非单体范围存在。
export const DamageDeliveryParamSchema = z.object({
	// 对应 DAMAGE_RANGE_TYPE 的字符串值，避免在 JSON schema 内硬依赖数据库 enum。
	rangeType: z.string().default("Single"),
	// 旧 effectiveRange 迁入具体伤害事件范围。
	effectiveRange: z.string().default("0"),
	// 单体技能没有 warningZone；范围技能由区域管理器解释此参数。
	warningZone: z.unknown().optional(),
});
export type DamageDeliveryParamData = z.output<typeof DamageDeliveryParamSchema>;

// 单次伤害事件的时间参数；周期与持续语义交给区域管理器解释。
export const DamageTimingParamSchema = z.object({
	delayMs: z.string().default("0"),
	durationMs: z.string().optional(),
	intervalMs: z.string().optional(),
	repeatCount: z.string().optional(),
});
export type DamageTimingParamData = z.output<typeof DamageTimingParamSchema>;

// 命中时判定的异常参数。
export const AilmentParamSchema = z.object({
	// 对应 ABNORMAL_TYPE 的字符串值。
	type: z.string(),
	// 发生概率，支持表达式。
	probability: z.string().default("100"),
	// 持续时间，按毫秒表达。
	durationMs: z.string().optional(),
});
export type AilmentParamData = z.output<typeof AilmentParamSchema>;

// 单次伤害事件；一个技能可拥有多个事件，每个事件独立命中与投递。
export const DamageEventParamSchema = z.object({
	name: z.string().optional(),
	formula: DamageFormulaParamSchema.default({
		constant: "0",
		multiplier: "100",
		element: { expression: "self.mainWeapon.element" },
	}),
	delivery: DamageDeliveryParamSchema.default({ rangeType: "Single", effectiveRange: "0" }),
	timing: DamageTimingParamSchema.default({ delayMs: "0" }),
	ailments: z.array(AilmentParamSchema).default([]),
});
export type DamageEventParamData = z.output<typeof DamageEventParamSchema>;

// 技能行为统一 DSL 步骤；op 决定节点语义，params 暂保持开放，便于逐个还原技能后再收紧。
export const SkillProgramStepSchema = z
	.object({
		op: z.string(),
		params: z.record(z.string(), z.unknown()).default({}),
	});
export type SkillProgramStepData = z.output<typeof SkillProgramStepSchema>;

// 技能行为统一模板；读条、伤害、回复、状态、EX 槽位都先进入同一个程序形状。
export const SkillProgramSchema = z
	.object({
		lifecycle: SkillBehaviorLifecycleSchema.optional(),
		attributeSlots: AttributeSlotDeclarationListSchema,
		steps: z.array(SkillProgramStepSchema).default([]),
		rawBranches: z.array(z.unknown()).default([]),
	});
export type SkillProgramData = z.output<typeof SkillProgramSchema>;

// 主动释放默认 DSL；自定义 activeBehaviorTree 存在时运行时会跳过此 DSL。
export const ActiveSkillBehaviorSchema = SkillProgramSchema;
export type ActiveSkillBehaviorData = z.output<typeof ActiveSkillBehaviorSchema>;

// 成员创建时安装的默认被动 DSL。
export const PassiveSkillBehaviorSchema = SkillProgramSchema;
export type PassiveSkillBehaviorData = z.output<typeof PassiveSkillBehaviorSchema>;

// 生命周期超过本次技能释放的长期注册行为 DSL。
export const RegisteredSkillBehaviorSchema = SkillProgramSchema;
export type RegisteredSkillBehaviorData = z.output<typeof RegisteredSkillBehaviorSchema>;

// 行为树
export const BTSchema = z.object({
	// 行为树名称
	name: z.string(),
	// 行为树定义持久化为 MDSL 源码；运行时解析为 JSON AST。
	definition: z.string(),
	// 可调用函数集
	agent: z.string(),
	// 行为树需要 checkpoint 的变量槽；默认空数组兼容历史数据。
	attributeSlots: z.array(AttributeSlotDeclarationSchema).default([]),
});
export type BTTree = z.output<typeof BTSchema>;

// 成员行为树
export const MemberBTSchema = z.object({
	...BTSchema.shape,
	// 执行者类型
	memberType: z.enum(MEMBER_TYPE).default("Player"),
});
export type MemberBTTree = z.output<typeof MemberBTSchema>;

/**
 * 托环里的表达式值。
 *
 * 职责：
 * - 允许维护者写常量，或写一段运行时表达式
 *
 * 目的：
 * - 简单托环可以直接写数字/布尔
 * - 复杂托环仍然可以挂到现有表达式求值器
 */
export const RegistletValueSchema = z.union([z.string(), z.number(), z.boolean()]);
export type RegistletValue = z.output<typeof RegistletValueSchema>;

/**
 * 三地址码指令的数据形状。运行时由 Pipeline `InstructionCompiler` 解释。
 *
 * 注意：这里只描述字段形态，不做运算符白名单校验；`op` 的合法值以
 * `src/lib/engine/core/Pipeline/instruction.ts` 的 `InstructionOp` 为准。
 */
export const PipelineInstructionSchema = z.object({
	target: z.string(),
	op: z.string(),
	a: z.union([z.number(), z.string()]),
	b: z.union([z.number(), z.string()]).optional(),
});
export type PipelineInstructionData = z.output<typeof PipelineInstructionSchema>;

/**
 * 单个管线 patch 内的一步局部操作。
 *
 * 说明：
 * - 触发时机不在这里描述，而由 pipelineName + slot 决定
 * - 这里仅描述“插入到公开 pipeline 槽位后要做什么”
 */
export const PipelinePatchStepSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("setValue"),
		target: z.string(),
		value: RegistletValueSchema,
	}),
	z.object({
		type: z.literal("runPipeline"),
		pipelineName: z.string(),
		params: z.record(z.string(), RegistletValueSchema).default({}),
	}),
	z.object({
		type: z.literal("scheduleMemberEvent"),
		eventName: z.string(),
		delay: RegistletValueSchema,
		payload: z.record(z.string(), RegistletValueSchema).default({}),
	}),
	z.object({
		type: z.literal("interrupt"),
		reason: z.string().optional(),
	}),
	/**
	 * 向目标管线的指定 slot 追加一组三地址码指令。
	 *
	 * 运行时效果：由 loader 构造一条 `PipelineOverlay.insertAfter` / `insertBefore`（取决于
	 * 外层 `PipelinePatchEffect.position`），锚点 = `slot`。这是"领教领教 / 殿后 / 最后的抵抗"
	 * 等需要直接改 payload 的 hook 的标准数据形态。
	 *
	 * 指令内的字符串 operand 支持占位符（由 loader 替换前）：
	 * - `{level}` — 托环当前等级
	 * - `{levelRate}` — level / 100（百分比的小数形式）
	 */
	z.object({
		type: z.literal("insertInstructions"),
		instructions: z.array(PipelineInstructionSchema).min(1),
	}),
]);
export type PipelinePatchStep = z.output<typeof PipelinePatchStepSchema>;

/**
 * 托环的管线 patch。
 *
 * 职责：
 * - 声明要挂到哪条公开 pipeline 的哪个槽位
 * - 声明插入后要执行的一组局部步骤
 *
 * 目的：
 * - 保持“触发时机”和“效果内容”分离
 * - 让托环数据只依赖公开 pipeline 契约，不直接依赖更细的引擎私有流程
 */
export const PipelinePatchEffectSchema = z.object({
	pipelineName: z.string(),
	slot: z.string(),
	position: z.enum(["before", "after"]).default("after"),
	priority: z.number().int().default(0),
	steps: z.array(PipelinePatchStepSchema).min(1),
});
export type PipelinePatchEffect = z.output<typeof PipelinePatchEffectSchema>;

/**
 * 技能分支激活器。
 *
 * 职责：
 * - 为某个技能提供一个分支选择值
 *
 * 目的：
 * - 托环只负责“打开哪个技能分支”
 * - 技能行为树本身继续负责分支结构与执行细节
 */
export const SkillBranchActivatorEffectSchema = z.object({
	skillId: z.string(),
	branchKey: z.string(),
	value: z.number(),
});
export type SkillBranchActivatorEffect = z.output<typeof SkillBranchActivatorEffectSchema>;

/**
 * 订阅 / watcher 触发时可执行的最小动作集。
 *
 * 所有动作使用来自 registlet 的稳定 sourceId，便于卸载时反向清理。
 * 字符串字段（attribute / value / probability / threshold / payload 值）支持占位符：
 *   `{level}` - 托环等级
 *   `{levelRate}` - 等级 / 100
 * loader 在安装时替换。
 */
export const RegistletHandlerSchema = z.discriminatedUnion("type", [
	/**
	 * 往 StatContainer 加一个 modifier。
	 *
	 * lifetime：
	 * - `once`：每次触发都加一次（sourceId 带本次事件帧号保证唯一）
	 * - `bySource`：使用 `sourceIdSuffix` 组合出稳定 sourceId；同 sourceId 下只会累计一条 modifier
	 *   （新的 addModifier 会叠加；需要配合 removeModifierBySource 清理）
	 */
	z.object({
		type: z.literal("addModifier"),
		attribute: z.string(),
		modifierType: z.enum(["dynamicFixed", "dynamicPercentage", "staticFixed", "staticPercentage"]),
		value: RegistletValueSchema,
		lifetime: z.enum(["once", "bySource"]).default("once"),
		sourceIdSuffix: z.string().optional(),
	}),
	/**
	 * 按 (registlet id + suffix) 组合的 sourceId 移除 StatContainer 上的 modifier。
	 * 典型用法：配合 `status.exited` 订阅，把 `status.entered` 时加的 modifier 撤掉。
	 */
	z.object({
		type: z.literal("removeModifierBySource"),
		attribute: z.string(),
		sourceIdSuffix: z.string(),
	}),
	/**
	 * 派发一个自定义事件（走本成员的 ProcBus）。
	 * 让复杂 registlet 可以通过"handler 派发 → 另一条 subscription 捕获"的方式串联。
	 */
	z.object({
		type: z.literal("emit"),
		eventName: z.string(),
		payload: z.record(z.string(), RegistletValueSchema).default({}),
	}),
]);
export type RegistletHandler = z.output<typeof RegistletHandlerSchema>;

/**
 * 事件订阅效果：订阅本成员 ProcBus 的指定事件，按条件过滤后执行一组 handler。
 *
 * 典型用例：
 * - 减轻追击：eventNames=["status.entered"]，requiredStatusTypes=[Flinch/Tumble/Stun]
 * - 燃烧的斗志：eventNames=["damage.received"]，requiredDamageTags=["ignition"]
 * - 爆能咏咒：eventNames=["skill.cast.completed"]，predicate 由外层语义（skillTreeType）补
 */
export const EventSubscriptionEffectSchema = z.object({
	eventNames: z.array(z.string()).min(1),
	requiredDamageTags: z.array(z.string()).default([]),
	requiredStatusTypes: z.array(z.string()).default([]),
	handlers: z.array(RegistletHandlerSchema).min(1),
});
export type EventSubscriptionEffect = z.output<typeof EventSubscriptionEffectSchema>;

/**
 * 属性阈值 watcher 效果：属性跨越阈值时触发一组 handler。
 *
 * 典型用例：
 * - HP 紧急回复：path=hp.current, threshold="self.hp.max * 0.25", direction=falling, cooldownMs=60000
 */
export const ThresholdWatcherEffectSchema = z.object({
	path: z.string(),
	threshold: RegistletValueSchema,
	direction: z.enum(["rising", "falling", "both"]).default("falling"),
	cooldownMs: z.number().int().nonnegative().default(0),
	fireOnRegister: z.boolean().default(false),
	handlers: z.array(RegistletHandlerSchema).min(1),
});
export type ThresholdWatcherEffect = z.output<typeof ThresholdWatcherEffectSchema>;
