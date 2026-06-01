import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { SkillVariantWithRelations } from "@db/generated/repositories/skill_variant";
import type { ExpressionContext } from "~/lib/engine/core/JSProcessor/types";
import type { StageData } from "~/lib/engine/core/Pipeline/stageEnv";

export interface PlayerSkillLifecycle {
	chanting: number;
	charging: number;
	startup: number;
	recovery: number;
}

type SkillVariantTimingSource = {
	chantingFixedMs?: string | null;
	chantingModifiedMs?: string | null;
	chargingFixedMs?: string | null;
	chargingModifiedMs?: string | null;
	actionFixedMs?: string | null;
	actionModifiedMs?: string | null;
	startupRatio?: string | null;
	activeBehavior?: unknown;
};

type ComputePlayerSkillLifecycleParams = {
	variant: SkillVariantTimingSource;
	skillLv: number;
	expressionContext: ExpressionContext;
	evaluateExpression: (expr: string, context: ExpressionContext) => number | boolean;
	runPipeline: <TName extends SkillLifecycleDurationPipelineName>(
		pipelineName: TName,
		params: SkillLifecycleDurationPipelineParams[TName],
	) => StageData;
	onWarn?: (message: string) => void;
};

type SkillLifecycleDurationPipelineParams = {
	"skill.chanting": { fixed: number; modified: number };
	"skill.charging": { fixed: number; modified: number };
	"skill.action": { fixed: number; modified: number };
};

type SkillLifecycleDurationPipelineName = keyof SkillLifecycleDurationPipelineParams;

export const EMPTY_PLAYER_SKILL_LIFECYCLE_MS: PlayerSkillLifecycle = {
	chanting: 0,
	charging: 0,
	startup: 0,
	recovery: 0,
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

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function getActiveBehaviorCastingRangeExpression(variant: { activeBehavior?: unknown }): string | null {
	const activeBehavior = asRecord(variant.activeBehavior);
	const lifecycle =
		asRecord(activeBehavior?.lifecycle) ?? asRecord(asRecord(activeBehavior?.behaviorParams)?.lifecycle);
	const targeting = asRecord(lifecycle?.targeting);
	const castingRange = targeting?.castingRange;
	return typeof castingRange === "string" ? castingRange : null;
}

export function getPlayerSkillLifecycleActionMs(lifecycle: PlayerSkillLifecycle): number {
	return lifecycle.startup + lifecycle.recovery;
}

export function getPlayerSkillLifecycleDurationMs(lifecycle: PlayerSkillLifecycle): number {
	return lifecycle.chanting + lifecycle.charging + getPlayerSkillLifecycleActionMs(lifecycle);
}

export function computePlayerSkillLifecycle(props: ComputePlayerSkillLifecycleParams): PlayerSkillLifecycle {
	const evalNum = (expr: string | null | undefined, label: string): number => {
		if (!expr) return 0;
		const asNumber = Number(expr);
		if (Number.isFinite(asNumber)) return asNumber;

		const out = props.evaluateExpression(expr, {
			...props.expressionContext,
			skillLv: props.skillLv,
		});
		if (typeof out === "number" && Number.isFinite(out)) return out;
		if (typeof out === "boolean") return out ? 1 : 0;
		props.onWarn?.(`${label} 求值结果非数字，置 0：${String(out)}`);
		return 0;
	};

	const chantingFixed = evalNum(props.variant.chantingFixedMs, "chantingFixedMs");
	const chantingModified = evalNum(props.variant.chantingModifiedMs, "chantingModifiedMs");
	const chargingFixed = evalNum(props.variant.chargingFixedMs, "chargingFixedMs");
	const chargingModified = evalNum(props.variant.chargingModifiedMs, "chargingModifiedMs");
	const actionFixed = evalNum(props.variant.actionFixedMs, "actionFixedMs");
	const actionModified = evalNum(props.variant.actionModifiedMs, "actionModifiedMs");
	const startupRatio = Math.max(0, Math.min(1, Number(props.variant.startupRatio) || 0));

	const runPipelineDurationMs = <TName extends SkillLifecycleDurationPipelineName>(
		pipelineName: TName,
		params: SkillLifecycleDurationPipelineParams[TName],
		fallbackMs: number,
	): number => {
		try {
			const out = props.runPipeline(pipelineName, params);
			const durationMs = out?.durationMs;
			if (typeof durationMs === "number" && Number.isFinite(durationMs)) {
				return Math.max(0, Math.floor(durationMs));
			}
		} catch (error) {
			props.onWarn?.(`运行 ${pipelineName} 失败: ${error instanceof Error ? error.message : String(error)}`);
		}
		return Math.max(0, Math.floor(fallbackMs));
	};

	const chanting = runPipelineDurationMs(
		"skill.chanting",
		{ fixed: chantingFixed, modified: chantingModified },
		chantingFixed + chantingModified,
	);
	const charging = runPipelineDurationMs(
		"skill.charging",
		{ fixed: chargingFixed, modified: chargingModified },
		chargingFixed + chargingModified,
	);
	// actionDurationMs 是拆分前动作总时长；runtime lifecycle 只暴露 BT 实际等待的 startup/recovery 阶段。
	const actionDurationMs = runPipelineDurationMs(
		"skill.action",
		{ fixed: actionFixed, modified: actionModified },
		actionFixed + actionModified,
	);
	const startup = Math.floor(actionDurationMs * startupRatio);
	const recovery = Math.max(0, actionDurationMs - startup);

	return {
		chanting,
		charging,
		startup,
		recovery,
	};
}
