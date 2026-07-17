import type { EngineRunOutput } from "~/lib/engine/core/runOutput";
import type { SimulationTaskResult } from "~/lib/engine/core/simulationTask";
import { type SkillRejectionReason, SkillRejectionReasonSchema } from "~/lib/engine/core/types";
import { memberFlowInputId } from "~/lib/engine/core/World/Member/memberFlowInput";
import {
	CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY,
	type CharacterPreviewPolicy,
	characterPreviewSetupInputKey,
} from "./compileCharacterPreviewBehavior";

export type CharacterPreviewResult =
	| {
			status: "accepted";
			candidateSkillId: string;
			damage: number;
			ticksRun: number;
			elapsedMs: number;
			note?: string;
	  }
	| { status: "rejected"; candidateSkillId: string; reason: SkillRejectionReason }
	| {
			status: "setup_failed";
			candidateSkillId: string;
			failedSetupSkillId: string;
			reason: SkillRejectionReason | "missing_verdict";
	  };

export class CharacterPreviewOutputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CharacterPreviewOutputError";
	}
}

const rejectionReason = (reason: string, inputId: string): SkillRejectionReason => {
	const parsed = SkillRejectionReasonSchema.safeParse(reason);
	if (!parsed.success) throw new CharacterPreviewOutputError(`预览输入 ${inputId} 返回了非法拒绝原因`);
	return parsed.data;
};

const findInput = (output: EngineRunOutput, inputId: string) =>
	output.inputs.findLast((input) => input.inputId === inputId);

/**
 * 把通用 EngineRunOutput 解释为 Character 技能预览结果。
 * setup 事实始终先于 candidate 解释，因此 candidate 接纳或伤害不能覆盖任一 setup 失败。
 */
export function interpretCharacterPreviewResult(
	result: SimulationTaskResult,
	policy: CharacterPreviewPolicy,
	candidateSkillId: string,
): CharacterPreviewResult {
	for (const [index, setup] of policy.setupSkills.entries()) {
		const inputId = memberFlowInputId(policy.memberId, characterPreviewSetupInputKey(index));
		const fact = findInput(result.output, inputId);
		if (!fact) {
			return {
				status: "setup_failed",
				candidateSkillId,
				failedSetupSkillId: setup.skillId,
				reason: "missing_verdict",
			};
		}
		if (fact.status === "rejected") {
			return {
				status: "setup_failed",
				candidateSkillId,
				failedSetupSkillId: setup.skillId,
				reason: rejectionReason(fact.reason, inputId),
			};
		}
	}

	const candidateInputId = memberFlowInputId(policy.memberId, CHARACTER_PREVIEW_CANDIDATE_INPUT_KEY);
	const candidateFact = findInput(result.output, candidateInputId);
	if (!candidateFact) {
		throw new CharacterPreviewOutputError(`候选技能 ${candidateSkillId} 缺少最终 FSM 判决`);
	}
	if (candidateFact.status === "rejected") {
		return {
			status: "rejected",
			candidateSkillId,
			reason: rejectionReason(candidateFact.reason, candidateInputId),
		};
	}

	const damage = result.output.damage
		.filter(
			(fact) =>
				fact.sourceMemberId === policy.memberId &&
				fact.targetMemberId === policy.trainingTargetMemberId &&
				fact.sourceSkillId === candidateSkillId,
		)
		.reduce((sum, fact) => sum + fact.damage, 0);
	return {
		status: "accepted",
		candidateSkillId,
		damage,
		ticksRun: result.stats.ticksRun,
		elapsedMs: result.stats.elapsedMs,
		note: damage === 0 ? "技能已被 FSM 接纳，本次运行伤害为 0" : undefined,
	};
}
