import type { EngineRunOutput, RunInputRecord } from "~/lib/engine/core/runOutput";
import type { SimulationDesign } from "./simulationDesignSchema";

export type SkillRunSummary = {
	skillId: string | null;
	skillName: string;
	releaseCount: number;
	hitCount: number;
	totalDamage: number;
	damageShare: number;
	averageDamagePerRelease: number;
};

export type RunSummary = {
	runId: string;
	durationMs: number;
	totalDamage: number;
	dps: number;
	successfulSkillSequence: Array<{ timeMs: number; memberId: string; skillId: string; skillName: string }>;
	skills: SkillRunSummary[];
};

export type CharacterInputSnapshot = {
	characterId: string;
	level: number;
	str: number;
	int: number;
	vit: number;
	agi: number;
	dex: number;
	baseStatTotal: number;
};

export type RunComparison = {
	a: RunSummary;
	b: RunSummary;
	delta: {
		durationMs: number;
		durationPercentFromA: number | null;
		totalDamage: number;
		totalDamagePercentFromA: number | null;
		dps: number;
		dpsPercentFromA: number | null;
	};
	characterA: CharacterInputSnapshot | null;
	characterB: CharacterInputSnapshot | null;
	characterDelta: Omit<CharacterInputSnapshot, "characterId"> | null;
	inputsA: RunInputRecord[];
	inputsB: RunInputRecord[];
};

export type RunComparisonMetric = {
	key: "durationMs" | "totalDamage" | "dps";
	label: string;
	a: number;
	b: number;
	delta: number;
	percentFromA: number | null;
};

function skillNames(design: SimulationDesign): Map<string, string> {
	const names = new Map<string, string>();
	for (const member of design.teams.flatMap((team) => team.members)) {
		for (const skill of member.character?.skills ?? []) {
			names.set(skill.id, skill.template.name);
		}
	}
	return names;
}

/** 从 DesignCopy 的分析范围和 Worker 事实纯派生摘要，不读取当前正式数据或 HUD。 */
export function analyzeRun(design: SimulationDesign, record: EngineRunOutput): RunSummary {
	const sourceIds = new Set(design.analysisSourceMembers.map((member) => member.id));
	const targetIds = new Set(design.analysisTargetMembers.map((member) => member.id));
	const names = skillNames(design);
	const durationMs = record.durationMs;
	const damageFacts = record.damage.filter(
		(fact) => sourceIds.has(fact.sourceMemberId) && targetIds.has(fact.targetMemberId),
	);
	const totalDamage = damageFacts.reduce((sum, fact) => sum + fact.damage, 0);
	const releases = record.skillReleases.filter((fact) => sourceIds.has(fact.memberId));
	const skillIds = new Set<string | null>([
		...releases.map((fact) => fact.skillId),
		...damageFacts.map((fact) => fact.sourceSkillId),
	]);
	const skills = Array.from(skillIds)
		.map((skillId): SkillRunSummary => {
			const skillDamage = damageFacts.filter((fact) => fact.sourceSkillId === skillId);
			const releaseCount = skillId === null ? 0 : releases.filter((fact) => fact.skillId === skillId).length;
			const damage = skillDamage.reduce((sum, fact) => sum + fact.damage, 0);
			return {
				skillId,
				skillName: skillId === null ? "其他来源" : (names.get(skillId) ?? skillId),
				releaseCount,
				hitCount: skillDamage.length,
				totalDamage: damage,
				damageShare: totalDamage === 0 ? 0 : damage / totalDamage,
				averageDamagePerRelease: releaseCount === 0 ? damage : damage / releaseCount,
			};
		})
		.sort((left, right) => right.totalDamage - left.totalDamage);

	return {
		runId: record.runId,
		durationMs,
		totalDamage,
		dps: durationMs === 0 ? 0 : totalDamage / (durationMs / 1000),
		successfulSkillSequence: releases.map((fact) => ({
			timeMs: fact.timeMs,
			memberId: fact.memberId,
			skillId: fact.skillId,
			skillName: names.get(fact.skillId) ?? fact.skillId,
		})),
		skills,
	};
}

export function primaryCharacterInput(design: SimulationDesign): CharacterInputSnapshot | null {
	const member = design.teams
		.flatMap((team) => team.members)
		.find((candidate) => candidate.id === design.primaryMemberId);
	const character = member?.character;
	if (!character) return null;
	return {
		characterId: character.id,
		level: character.lv,
		str: character.str,
		int: character.int,
		vit: character.vit,
		agi: character.agi,
		dex: character.dex,
		baseStatTotal: character.str + character.int + character.vit + character.agi + character.dex,
	};
}

/** A/B 有方向：百分比固定以 A 为基准，A 为零时返回 null，不伪造无穷百分比。 */
export function compareRuns(
	designA: SimulationDesign,
	recordA: EngineRunOutput,
	designB: SimulationDesign,
	recordB: EngineRunOutput,
): RunComparison {
	const a = analyzeRun(designA, recordA);
	const b = analyzeRun(designB, recordB);
	const characterA = primaryCharacterInput(designA);
	const characterB = primaryCharacterInput(designB);
	return {
		a,
		b,
		delta: {
			durationMs: b.durationMs - a.durationMs,
			durationPercentFromA: a.durationMs === 0 ? null : (b.durationMs - a.durationMs) / a.durationMs,
			totalDamage: b.totalDamage - a.totalDamage,
			totalDamagePercentFromA: a.totalDamage === 0 ? null : (b.totalDamage - a.totalDamage) / a.totalDamage,
			dps: b.dps - a.dps,
			dpsPercentFromA: a.dps === 0 ? null : (b.dps - a.dps) / a.dps,
		},
		characterA,
		characterB,
		characterDelta:
			characterA && characterB
				? {
						level: characterB.level - characterA.level,
						str: characterB.str - characterA.str,
						int: characterB.int - characterA.int,
						vit: characterB.vit - characterA.vit,
						agi: characterB.agi - characterA.agi,
						dex: characterB.dex - characterA.dex,
						baseStatTotal: characterB.baseStatTotal - characterA.baseStatTotal,
					}
				: null,
		inputsA: recordA.inputs,
		inputsB: recordB.inputs,
	};
}

/** 为对比 CUI 提供固定四列指标，避免 JSX 各自遗漏 A/B 原值或百分比。 */
export function projectRunComparisonMetrics(comparison: RunComparison): RunComparisonMetric[] {
	return [
		{
			key: "durationMs",
			label: "时长",
			a: comparison.a.durationMs,
			b: comparison.b.durationMs,
			delta: comparison.delta.durationMs,
			percentFromA: comparison.delta.durationPercentFromA,
		},
		{
			key: "totalDamage",
			label: "总伤害",
			a: comparison.a.totalDamage,
			b: comparison.b.totalDamage,
			delta: comparison.delta.totalDamage,
			percentFromA: comparison.delta.totalDamagePercentFromA,
		},
		{
			key: "dps",
			label: "DPS",
			a: comparison.a.dps,
			b: comparison.b.dps,
			delta: comparison.delta.dps,
			percentFromA: comparison.delta.dpsPercentFromA,
		},
	];
}
