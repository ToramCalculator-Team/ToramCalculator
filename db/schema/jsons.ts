/**
 * @file jsons.ts
 * @description Json 定义文件
 *
 * 此文件主要用于定义数据库中出现的 Json 类型，生成器会将这里的内容补充到生成的zod/index.ts文件中。
 */
import { z } from "zod/v4";
import { MEMBER_TYPE } from "./enums";

// 行为树
export const BTSchema = z.object({
	// 行为树名称
	name: z.string(),
	// 行为树定义
	definition: z.string(),
	// 可调用函数集
	agent: z.string(),
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
 * - HP 紧急回复：path=hp.current, threshold="self.hp.max * 0.25", direction=falling, cooldown=3600
 */
export const ThresholdWatcherEffectSchema = z.object({
	path: z.string(),
	threshold: RegistletValueSchema,
	direction: z.enum(["rising", "falling", "both"]).default("falling"),
	cooldownFrames: z.number().int().nonnegative().default(0),
	fireOnRegister: z.boolean().default(false),
	handlers: z.array(RegistletHandlerSchema).min(1),
});
export type ThresholdWatcherEffect = z.output<typeof ThresholdWatcherEffectSchema>;
