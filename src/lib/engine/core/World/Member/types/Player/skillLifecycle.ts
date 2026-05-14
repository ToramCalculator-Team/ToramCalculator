import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { SkillVariantWithRelations } from "@db/generated/repositories/skill_variant";
import type { ExpressionContext } from "~/lib/engine/core/JSProcessor/types";
import type { StageData } from "~/lib/engine/core/Pipeline/stageEnv";

export interface PlayerSkillLifecycleMs {
	startupMs: number;
	chargingMs: number;
	chantingMs: number;
	actionMs: number;
	activeEffectDurationMs: number;
}

export type SkillVariantTimingMs = {
	startupMs?: string | null;
	actionFixedMs?: string | null;
	actionModifiedMs?: string | null;
	chantingFixedMs?: string | null;
	chantingModifiedMs?: string | null;
	chargingFixedMs?: string | null;
	chargingModifiedMs?: string | null;
};

type ComputePlayerSkillLifecycleParams = {
	variant: SkillVariantTimingMs;
	skillLevel: number;
	expressionContext: ExpressionContext;
	evaluateExpression: (expr: string, context: ExpressionContext) => number | boolean;
	runPipeline: (pipelineName: string, params?: Record<string, unknown>) => StageData;
	onWarn?: (message: string) => void;
};

export const EMPTY_PLAYER_SKILL_LIFECYCLE_MS: PlayerSkillLifecycleMs = {
	startupMs: 0,
	chargingMs: 0,
	chantingMs: 0,
	actionMs: 0,
	activeEffectDurationMs: 0,
};

export function selectPlayerSkillVariant(
	skill: CharacterSkillWithRelations,
	character: CharacterWithRelations | null,
): SkillVariantWithRelations | undefined {
	if (character === null) return undefined;
	return skill.template?.variants.find((variant) => {
		const weaponCondition =
			variant.targetMainWeaponType === character.weapon?.type || variant.targetMainWeaponType === "Any";
		const subWeaponCondition =
			variant.targetSubWeaponType === character.subWeapon?.type || variant.targetSubWeaponType === "Any";
		const armorAbilityCondition =
			variant.targetArmorAbilityType === character.armor?.ability || variant.targetArmorAbilityType === "Any";
		return weaponCondition && subWeaponCondition && armorAbilityCondition;
	});
}

export function computePlayerSkillLifecycleMs({
	variant,
	skillLevel,
	expressionContext,
	evaluateExpression,
	runPipeline,
	onWarn,
}: ComputePlayerSkillLifecycleParams): PlayerSkillLifecycleMs {
	const context = { ...expressionContext, skillLv: skillLevel };
	const evalNum = (expr: string | null | undefined, label: string): number => {
		if (!expr) return 0;
		const asNumber = Number(expr);
		if (Number.isFinite(asNumber)) return asNumber;

		const out = evaluateExpression(expr, context);
		if (typeof out === "number" && Number.isFinite(out)) return out;
		if (typeof out === "boolean") return out ? 1 : 0;
		onWarn?.(`${label} 求值结果非数字，置 0：${String(out)}`);
		return 0;
	};

	const timing = variant as SkillVariantTimingMs;
	const startupOriginal = evalNum(timing.startupMs, "startupMs");
	const actionFixed = evalNum(timing.actionFixedMs, "actionFixedMs");
	const actionModified = evalNum(timing.actionModifiedMs, "actionModifiedMs");
	const chantingFixed = evalNum(timing.chantingFixedMs, "chantingFixedMs");
	const chantingModified = evalNum(timing.chantingModifiedMs, "chantingModifiedMs");
	const chargingFixed = evalNum(timing.chargingFixedMs, "chargingFixedMs");
	const chargingModified = evalNum(timing.chargingModifiedMs, "chargingModifiedMs");

	const runPipelineDurationMs = (pipelineName: string, params: Record<string, unknown>, fallback: number): number => {
		try {
			const out = runPipeline(pipelineName, params);
			const durationMs = out?.durationMs;
			if (typeof durationMs === "number" && Number.isFinite(durationMs)) {
				return Math.max(0, Math.floor(durationMs));
			}
		} catch (error) {
			onWarn?.(`运行 ${pipelineName} 失败: ${error instanceof Error ? error.message : String(error)}`);
		}
		return Math.max(0, Math.floor(fallback));
	};

	const startupMs = runPipelineDurationMs("skill.startup", { original: startupOriginal }, startupOriginal);
	const chargingMs = runPipelineDurationMs(
		"skill.charging",
		{ fixed: chargingFixed, modified: chargingModified },
		chargingFixed + chargingModified,
	);
	const chantingMs = runPipelineDurationMs(
		"skill.chanting",
		{ fixed: chantingFixed, modified: chantingModified },
		chantingFixed + chantingModified,
	);
	const actionMs = runPipelineDurationMs(
		"skill.action",
		{ fixed: actionFixed, modified: actionModified },
		actionFixed + actionModified,
	);

	return {
		startupMs,
		chargingMs,
		chantingMs,
		actionMs,
		// 设计说明：startup 是动作内的生效点，action 是整段动作锁定时间；累计主动效果时长时用 max 避免重复计算前摇。
		activeEffectDurationMs: chargingMs + chantingMs + Math.max(actionMs, startupMs),
	};
}
