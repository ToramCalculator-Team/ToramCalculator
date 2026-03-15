import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v4";
import { PipelineRegistry } from "./PipelineRegistry";
import { defineAction, type ActionPool, type PipelineDef } from "./types";
import type { CommonContext } from "../Agent/CommonContext";

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
	normalizeStatusApplyRequest: defineAction(
		statusApplyRequestSchema,
		statusApplyNormalizedSchema,
		(_context, input) => ({
			...input,
			tags: input.tags?.length ? input.tags : [input.statusType],
		}),
	),
	resolveStatusApplyDuration: defineAction(
		statusApplyNormalizedSchema,
		statusApplyResolvedSchema,
		(context, input) => {
			const durationRate = resolveStatusDurationRate(context, input.statusType);
			return {
				...input,
				durationRate,
				resolvedDurationFrames: Math.max(0, Math.floor((input.baseDurationFrames * durationRate) / 100)),
			};
		},
	),
	createStatusApplyInstance: defineAction(
		statusApplyResolvedSchema,
		statusApplyInstanceSchema,
		(context, input) => {
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
		},
	),
	commitStatusApplyInstance: defineAction(
		statusApplyInstanceSchema,
		statusApplyCommittedSchema,
		(context, input) => {
			context.owner?.applyStatusInstance(input.instance);
			return {
				...input,
				applied: true,
				instanceId: input.instance.id,
			};
		},
	),
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
	new PipelineRegistry<CommonContext, typeof DefaultPipelineActionPool>(
		DefaultPipelineActionPool,
		DefaultPipelineDef,
	);
