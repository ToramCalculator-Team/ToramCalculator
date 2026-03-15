import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v4";
import type { CommonContext } from "../Agent/CommonContext";
import { defineStage, type PipeLineDef, type StagePool } from "./types";

/**
 * 状态施加相关阶段池。
 *
 * 设计目标：
 * - 每个阶段都只负责单一步骤
 * - 通过稳定的阶段名称提供可插入点
 * - 后续允许托环/被动在特定阶段前后插入逻辑
 */

const statusApplyRequestSchema = z.object({
	statusType: z.string(),
	baseDurationFrames: z.number().int().nonnegative(),
	sourceId: z.string().optional(),
	sourceSkillId: z.string().optional(),
	tags: z.array(z.string()).optional(),
	meta: z.record(z.string(), z.unknown()).optional(),
});

const statusApplyNormalizedSchema = z.object({
	statusType: z.string(),
	baseDurationFrames: z.number().int().nonnegative(),
	sourceId: z.string().optional(),
	sourceSkillId: z.string().optional(),
	tags: z.array(z.string()),
	meta: z.record(z.string(), z.unknown()).optional(),
});

const statusApplyResolvedSchema = statusApplyNormalizedSchema.extend({
	durationRate: z.number(),
	resolvedDurationFrames: z.number().int().nonnegative(),
});

const statusInstanceSchema = z.object({
	id: z.string(),
	type: z.string(),
	sourceId: z.string().optional(),
	sourceSkillId: z.string().optional(),
	appliedAtFrame: z.number().int().nonnegative(),
	resolvedDurationFrames: z.number().int().nonnegative(),
	expiresAtFrame: z.number().int().nonnegative(),
	tags: z.array(z.string()),
	meta: z.record(z.string(), z.unknown()).optional(),
});

const statusApplyInstanceSchema = statusApplyResolvedSchema.extend({
	instance: statusInstanceSchema,
});

const statusApplyCommittedSchema = statusApplyInstanceSchema.extend({
	applied: z.boolean(),
	instanceId: z.string(),
});

const resolveStatusDurationRate = (context: CommonContext, statusType: string): number => {
	const owner = context.owner;
	if (!owner) return 100;
	if (statusType === "sleep") {
		const rate = owner.statContainer.getValue("status.sleep.durationRate" as never);
		return rate > 0 ? rate : 100;
	}
	return 100;
};

export const StatusStages = {
	/** 补全 tags 等输入缺省值。 */
	状态施加_标准化输入: defineStage(statusApplyRequestSchema, statusApplyNormalizedSchema, (_context, input) => ({
		...input,
		tags: input.tags?.length ? input.tags : [input.statusType],
	})),
	/** 读取成员 stat 并结算状态持续时间倍率。 */
	状态施加_持续时间倍率计算: defineStage(statusApplyNormalizedSchema, statusApplyResolvedSchema, (context, input) => {
		const durationRate = resolveStatusDurationRate(context, input.statusType);
		return {
			...input,
			durationRate,
			resolvedDurationFrames: Math.max(0, Math.floor((input.baseDurationFrames * durationRate) / 100)),
		};
	}),
	/** 把结算结果转换成状态实例。 */
	状态施加_状态实例创建: defineStage(statusApplyResolvedSchema, statusApplyInstanceSchema, (context, input) => {
		const appliedAtFrame = context.getCurrentFrame();
		return {
			...input,
			instance: {
				id: createId(),
				type: input.statusType,
				sourceId: input.sourceId,
				sourceSkillId: input.sourceSkillId,
				appliedAtFrame,
				resolvedDurationFrames: input.resolvedDurationFrames,
				expiresAtFrame: appliedAtFrame + input.resolvedDurationFrames,
				tags: input.tags,
				meta: input.meta,
			},
		};
	}),
	/** 将状态实例写回成员状态仓库。 */
	状态施加_提交状态实例: defineStage(statusApplyInstanceSchema, statusApplyCommittedSchema, (context, input) => {
		context.owner?.applyStatusInstance(input.instance);
		return {
			...input,
			applied: true,
			instanceId: input.instance.id,
		};
	}),
} as const satisfies StagePool<CommonContext>;

export const StatusPipelineDef = {
	"status.apply": [
		"状态施加_标准化输入",
		"状态施加_持续时间倍率计算",
		"状态施加_状态实例创建",
		"状态施加_提交状态实例",
	],
} as const satisfies PipeLineDef<typeof StatusStages>;
