import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v4";
import type { CommonContext } from "../Agent/CommonContext";
import { PipelineRegistry } from "./PipelineRegistry";
import { type ActionPool, defineAction, type PipelineDef } from "./types";

/**
 * 默认内建管线定义。
 *
 * 当前目标：
 * - 给引擎提供最小可运行的内建 registry
 * - 先落地第一条“状态施加”业务切片
 *
 * 当前范围：
 * - 只覆盖 `status.apply`
 * - 只先实现睡眠持续时间倍率读取
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

export const DefaultPipelineActionPool = {
	/** 统一补全 tags 等输入缺省值。 */
	normalizeStatusApplyRequest: defineAction(
		statusApplyRequestSchema,
		statusApplyNormalizedSchema,
		(_context, input) => ({
			...input,
			tags: input.tags?.length ? input.tags : [input.statusType],
		}),
	),
	/** 从成员 stat 中读取持续时间倍率，并结算最终持续帧数。 */
	resolveStatusApplyDuration: defineAction(statusApplyNormalizedSchema, statusApplyResolvedSchema, (context, input) => {
		const durationRate = resolveStatusDurationRate(context, input.statusType);
		return {
			...input,
			durationRate,
			resolvedDurationFrames: Math.max(0, Math.floor((input.baseDurationFrames * durationRate) / 100)),
		};
	}),
	/** 把结算结果转换成状态实例。 */
	createStatusApplyInstance: defineAction(statusApplyResolvedSchema, statusApplyInstanceSchema, (context, input) => {
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
	commitStatusApplyInstance: defineAction(statusApplyInstanceSchema, statusApplyCommittedSchema, (context, input) => {
		context.owner?.applyStatusInstance(input.instance);
		return {
			...input,
			applied: true,
			instanceId: input.instance.id,
		};
	}),
} as const satisfies ActionPool<CommonContext>;

export const DefaultPipelineDef = {
	"status.apply": [
		"normalizeStatusApplyRequest",
		"resolveStatusApplyDuration",
		"createStatusApplyInstance",
		"commitStatusApplyInstance",
	],
} as const satisfies PipelineDef<typeof DefaultPipelineActionPool>;

export const createDefaultPipelineRegistry = () =>
	new PipelineRegistry<CommonContext, typeof DefaultPipelineActionPool>(DefaultPipelineActionPool, DefaultPipelineDef);
