import { defaultData } from "@db/defaultData";
import { describe, expect, it } from "vitest";
import { EngineRunOutputSchema } from "~/lib/engine/core/runOutput";
import { createTestTickStateHistory } from "~/lib/engine/core/tickStateHistory.testUtils";
import { analyzeRun, compareRuns, projectRunComparisonMetrics } from "./analysis";
import { SimulationDesignSchema } from "./simulationDesignSchema";

const design = SimulationDesignSchema.parse({
	...defaultData.simulator,
	id: "sim-1",
	logicHz: 10,
	primaryMemberId: "player-member",
	teams: [
		{
			...defaultData.team,
			id: "team-a",
			camp: "A",
			belongToSimulatorId: "sim-1",
			members: [
				{
					...defaultData.member,
					id: "player-member",
					type: "Player",
					characterId: "character-1",
					belongToTeamId: "team-a",
					character: {
						...defaultData.character,
						id: "character-1",
						lv: 100,
						str: 10,
						int: 20,
						vit: 30,
						agi: 40,
						dex: 50,
						weapon: null,
						subWeapon: null,
						armor: null,
						option: null,
						special: null,
						skills: [],
						registlets: [],
						avatars: [],
						consumables: [],
						combos: [],
					},
					mob: null,
				},
			],
		},
	],
	analysisSourceMembers: [{ id: "player-member" }],
	analysisTargetMembers: [{ id: "target-member" }],
});

const record = EngineRunOutputSchema.parse({
	runId: "run-1",
	durationMs: 200,
	stateHistory: createTestTickStateHistory(2, 100),
	inputs: [],
	skillReleases: [{ memberId: "player-member", skillId: "skill-1", timeMs: 0 }],
	damage: [
		{
			sourceMemberId: "player-member",
			targetMemberId: "target-member",
			sourceSkillId: "skill-1",
			damage: 100,
			timeMs: 0,
		},
		{
			sourceMemberId: "player-member",
			targetMemberId: "target-member",
			sourceSkillId: "skill-1",
			damage: 200,
			timeMs: 100,
		},
		{
			sourceMemberId: "player-member",
			targetMemberId: "target-member",
			sourceSkillId: null,
			damage: 50,
			timeMs: 100,
		},
		{
			sourceMemberId: "outside",
			targetMemberId: "target-member",
			sourceSkillId: null,
			damage: 999,
			timeMs: 100,
		},
	],
});

describe("运行分析", () => {
	it("分离技能释放、多段命中和其他来源，并过滤分析范围外伤害", () => {
		const summary = analyzeRun(design, record);
		expect(summary.durationMs).toBe(200);
		expect(summary.totalDamage).toBe(350);
		expect(summary.dps).toBe(1750);
		expect(summary.skills.find((skill) => skill.skillId === "skill-1")).toMatchObject({
			releaseCount: 1,
			hitCount: 2,
			totalDamage: 300,
		});
		expect(summary.skills.find((skill) => skill.skillId === null)?.totalDamage).toBe(50);
	});

	it("A 为零基准时不伪造百分比", () => {
		const empty = EngineRunOutputSchema.parse({
			...record,
			runId: "empty",
			durationMs: 0,
			stateHistory: createTestTickStateHistory(),
			damage: [],
			skillReleases: [],
		});
		const comparison = compareRuns(design, empty, design, record);
		expect(comparison.delta.durationPercentFromA).toBeNull();
		expect(comparison.delta.totalDamagePercentFromA).toBeNull();
		expect(comparison.delta.dpsPercentFromA).toBeNull();
		expect(comparison.characterDelta?.baseStatTotal).toBe(0);
	});

	it("三项结果以 A 为方向基准计算正向、小数和反向百分比", () => {
		const larger = EngineRunOutputSchema.parse({
			...record,
			runId: "larger",
			durationMs: 300,
			stateHistory: createTestTickStateHistory(3, 100),
			damage: record.damage.map((fact) => ({ ...fact, damage: fact.damage * 2 })),
		});
		const positive = compareRuns(design, record, design, larger);
		expect(positive.delta.durationPercentFromA).toBeCloseTo(0.5);
		expect(positive.delta.totalDamagePercentFromA).toBeCloseTo(1);
		expect(positive.delta.dpsPercentFromA).toBeCloseTo(1 / 3);
		expect(projectRunComparisonMetrics(positive)).toEqual([
			{
				key: "durationMs",
				label: "时长",
				a: positive.a.durationMs,
				b: positive.b.durationMs,
				delta: positive.delta.durationMs,
				percentFromA: positive.delta.durationPercentFromA,
			},
			{
				key: "totalDamage",
				label: "总伤害",
				a: positive.a.totalDamage,
				b: positive.b.totalDamage,
				delta: positive.delta.totalDamage,
				percentFromA: positive.delta.totalDamagePercentFromA,
			},
			{
				key: "dps",
				label: "DPS",
				a: positive.a.dps,
				b: positive.b.dps,
				delta: positive.delta.dps,
				percentFromA: positive.delta.dpsPercentFromA,
			},
		]);

		const negative = compareRuns(design, larger, design, record);
		expect(negative.delta.durationPercentFromA).toBeCloseTo(-1 / 3);
		expect(negative.delta.totalDamagePercentFromA).toBeCloseTo(-0.5);
		expect(negative.delta.dpsPercentFromA).toBeCloseTo(-0.25);
	});
});
