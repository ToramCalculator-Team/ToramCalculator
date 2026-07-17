import { describe, expect, it } from "vitest";
import type { EngineRunOutput, RunInputRecord } from "~/lib/engine/core/runOutput";
import type { SimulationTaskResult } from "~/lib/engine/core/simulationTask";
import { memberFlowInputId } from "~/lib/engine/core/World/Member/memberFlowInput";
import {
	CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY,
	type CharacterPreviewPolicy,
	characterPreviewSetupInputKey,
} from "./compileCharacterPreviewBehavior";
import { CharacterPreviewOutputError, interpretCharacterPreviewResult } from "./interpretCharacterPreviewResult";

const policy: CharacterPreviewPolicy = {
	memberId: "preview-member",
	trainingTargetMemberId: "training-target",
	setupSkills: [{ skillId: "setup-a" }, { skillId: "setup-b" }],
};

const previewInputId = (inputKey: string): string => memberFlowInputId(policy.memberId, inputKey);

const input = (inputId: string, status: RunInputRecord["status"], reason?: string): RunInputRecord => {
	const base = {
		inputId,
		memberId: policy.memberId,
		timeMs: 100,
	};
	if (status === "accepted") {
		return {
			...base,
			status,
			action: { type: "使用技能", payload: { skillId: "test-skill" } },
		};
	}
	if (reason === undefined) throw new Error(`拒绝输入 ${inputId} 缺少测试原因`);
	return { ...base, status, reason, action: { type: "使用技能", payload: { skillId: "test-skill" } } };
};

const taskResult = (overrides: Partial<EngineRunOutput>): SimulationTaskResult => ({
	output: {
		runId: "run-1",
		durationMs: 1000,
		stateHistory: null,
		inputs: [],
		skillReleases: [],
		damage: [],
		...overrides,
	},
	stats: { ticksRun: 10, elapsedMs: 4, reachedLimit: false },
});

describe("interpretCharacterPreviewResult", () => {
	it("任一 setup rejected 都优先映射为 setup failure", () => {
		const result = taskResult({
			inputs: [
				input(previewInputId(characterPreviewSetupInputKey(0)), "accepted"),
				input(previewInputId(characterPreviewSetupInputKey(1)), "rejected", "insufficient_mp"),
				input(previewInputId(CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY), "accepted"),
			],
			damage: [
				{
					sourceMemberId: policy.memberId,
					targetMemberId: policy.trainingTargetMemberId,
					sourceSkillId: "candidate",
					damage: 999,
					timeMs: 500,
				},
			],
		});

		expect(interpretCharacterPreviewResult(result, policy, "candidate")).toEqual({
			status: "setup_failed",
			candidateSkillId: "candidate",
			failedSetupSkillId: "setup-b",
			reason: "insufficient_mp",
		});
	});

	it("setup 缺少最终事实时返回 missing_verdict，不解释 candidate", () => {
		const result = taskResult({
			inputs: [
				input(previewInputId(characterPreviewSetupInputKey(0)), "accepted"),
				input(previewInputId(CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY), "accepted"),
			],
		});
		expect(interpretCharacterPreviewResult(result, policy, "candidate")).toMatchObject({
			status: "setup_failed",
			failedSetupSkillId: "setup-b",
			reason: "missing_verdict",
		});
	});

	it("candidate rejected 保留 Player FSM 的权威原因", () => {
		const result = taskResult({
			inputs: [
				input(previewInputId(characterPreviewSetupInputKey(0)), "accepted"),
				input(previewInputId(characterPreviewSetupInputKey(1)), "accepted"),
				input(previewInputId(CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY), "rejected", "cooldown_active"),
			],
		});
		expect(interpretCharacterPreviewResult(result, policy, "candidate")).toEqual({
			status: "rejected",
			candidateSkillId: "candidate",
			reason: "cooldown_active",
		});
	});

	it("candidate accepted 只累计候选对训练目标的伤害，并保留合法 0", () => {
		const inputs = [
			input(previewInputId(characterPreviewSetupInputKey(0)), "accepted"),
			input(previewInputId(characterPreviewSetupInputKey(1)), "accepted"),
			input(previewInputId(CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY), "accepted"),
		];
		const zero = interpretCharacterPreviewResult(taskResult({ inputs }), policy, "candidate");
		expect(zero).toMatchObject({ status: "accepted", damage: 0, ticksRun: 10, elapsedMs: 4 });

		const damage = interpretCharacterPreviewResult(
			taskResult({
				inputs,
				damage: [
					{
						sourceMemberId: policy.memberId,
						targetMemberId: policy.trainingTargetMemberId,
						sourceSkillId: "candidate",
						damage: 10,
						timeMs: 500,
					},
					{
						sourceMemberId: policy.memberId,
						targetMemberId: policy.trainingTargetMemberId,
						sourceSkillId: "candidate",
						damage: 15,
						timeMs: 600,
					},
					{
						sourceMemberId: policy.memberId,
						targetMemberId: "other-target",
						sourceSkillId: "candidate",
						damage: 1000,
						timeMs: 600,
					},
				],
			}),
			policy,
			"candidate",
		);
		expect(damage).toMatchObject({ status: "accepted", damage: 25 });
	});

	it("candidate 缺少最终判决或拒绝原因非法时显式报协议错误", () => {
		const setupInputs = [
			input(previewInputId(characterPreviewSetupInputKey(0)), "accepted"),
			input(previewInputId(characterPreviewSetupInputKey(1)), "accepted"),
		];
		expect(() => interpretCharacterPreviewResult(taskResult({ inputs: setupInputs }), policy, "candidate")).toThrow(
			CharacterPreviewOutputError,
		);
		expect(() =>
			interpretCharacterPreviewResult(
				taskResult({
					inputs: [...setupInputs, input(previewInputId(CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY), "rejected", "bad")],
				}),
				policy,
				"candidate",
			),
		).toThrow("非法拒绝原因");
	});
});
