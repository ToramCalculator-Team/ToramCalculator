import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v4";
import type { MemberContext } from "../../World/Member/MemberContext";
import { defineStage, type PipelineDef, type StagePool } from "../types";

// 输入参数 schema
const startupFormulaSchema = z.object({
	startupFormula: z.string(),
});

const originalStartupFramesSchema = z.object({
	originalStartupFrames: z.number().int().nonnegative(),
});

// 输出参数 schema
const startupRateSchema = z.object({
	startupRate: z.number(),
});

const startupFramesSchema = z.object({
	startupFrames: z.number().int().nonnegative(),
});

export const SkillStages = {
	原始前摇时长计算: defineStage(startupFormulaSchema, originalStartupFramesSchema, (context, input) => {
		const owner = context.owner;
		if (!owner) {
			throw new Error("owner is required");
		}
		const originalStartupFrames = context.expressionEvaluator?.(input.startupFormula, {
			currentFrame: context.getCurrentFrame(),
			casterId: owner.id,
			skillLv: context.currentSkill?.lv,
		});
		if (typeof originalStartupFrames !== "number") {
			throw new Error("originalStartupFrames is not a number");
		}
		return {
			originalStartupFrames,
		};
	}),
	前摇修正倍率计算: defineStage(z.object({}), startupRateSchema, (context, _input) => {
		const owner = context.owner;
		if (!owner) {
			throw new Error("owner is required");
		}
		const mspd = owner.statContainer.getValue("mspd");
		return {
			startupRate: Math.max(0.5, 1 - mspd),
		};
	}),
	最终前摇时长计算: defineStage(z.object({}), startupFramesSchema, (_context, input) => {
		const originalStartupFrames = input.originalStartupFrames;
		const startupRate = input.startupRate;
		const startupFrames = Math.floor(originalStartupFrames * startupRate);
		return {
			startupFrames,
		};
	}),
} as const satisfies StagePool<MemberContext>;

export const SkillPipelineDef = {
	"skill.startUp": ["原始前摇时长计算", "前摇修正倍率计算", "最终前摇时长计算"],
} as const satisfies PipelineDef<typeof SkillStages>;
