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
