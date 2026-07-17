import { MemberBTSchema, type MemberBTTree } from "@db/schema/jsons";
import type { AcceptedRunInputRecord, EngineRunOutput, RunInputRecord } from "~/lib/engine/core/runOutput";
import { createDesignCopy, type DesignCopy } from "./designCopy";

const mdslString = (value: string) => JSON.stringify(value);

/** 行动录制只消费被引擎最终接纳的输入，不在 EngineRunOutput 中保存第二份数组。 */
export const selectAcceptedRunInputs = (inputs: readonly RunInputRecord[]): AcceptedRunInputRecord[] =>
	inputs.filter((input): input is AcceptedRunInputRecord => input.status === "accepted");

/**
 * 将一次运行中真正接纳的目标切换与技能行动机械编译为固定模拟时刻成员流程。
 * 编译只保留相对时序，不推断冷却等待、重试或失败后的控制流。
 */
export function compileRecordedActionsToMemberBehavior(actions: AcceptedRunInputRecord[]): MemberBTTree {
	const recordedActions = actions
		.map((action, order) => ({ action, order }))
		.sort((left, right) => left.action.timeMs - right.action.timeMs || left.order - right.order)
		.map(({ action }) => action);
	const lines = ["root {", "\tsequence {"];
	let previousTimeMs = 0;
	for (const action of recordedActions) {
		const waitDurationMs = Math.max(0, action.timeMs - previousTimeMs);
		if (waitDurationMs > 0) lines.push(`\t\twait [${waitDurationMs}]`);
		switch (action.action.type) {
			case "切换目标":
				lines.push(
					`\t\taction [selectTarget, ${mdslString(action.action.payload.targetId)}, ${mdslString(action.inputId)}]`,
				);
				break;
			case "使用技能":
				lines.push(
					`\t\taction [castSkill, ${mdslString(action.action.payload.skillId)}, ${mdslString(action.inputId)}]`,
				);
				break;
			default:
				throw new Error(`行动录制暂不支持 accepted 输入: ${action.action.type} (${action.inputId})`);
		}
		previousTimeMs = action.timeMs;
	}
	lines.push("\t}", "}");
	return MemberBTSchema.parse({
		name: "recorded-member-flow",
		definition: lines.join("\n"),
		agent: "",
		memberType: "Player",
		attributeSlots: [],
	});
}

type RecordedBehaviorRun = {
	id: string;
	designCopyId: string;
	output: Pick<EngineRunOutput, "inputs">;
};

export type RecordedBehaviorBranchResult = { ok: true; copy: DesignCopy } | { ok: false; error: string };

/**
 * 从 RunRecord 绑定的源副本创建新的行动录制分支。
 * 当前选中副本不参与解析，避免把历史运行事实写入无关设计。
 */
export function createRecordedBehaviorDesignCopy(
	designCopies: readonly DesignCopy[],
	runRecords: readonly RecordedBehaviorRun[],
	runId: string,
): RecordedBehaviorBranchResult {
	const record = runRecords.find((candidate) => candidate.id === runId);
	if (!record) return { ok: false, error: `RunRecord 不存在: ${runId}` };
	const source = designCopies.find((candidate) => candidate.id === record.designCopyId);
	if (!source) return { ok: false, error: `RunRecord ${runId} 的源 DesignCopy 不存在: ${record.designCopyId}` };
	const draft = structuredClone(source.design);
	const primary = draft.teams.flatMap((team) => team.members).find((member) => member.id === draft.primaryMemberId);
	if (!primary || primary.type !== "Player") {
		return { ok: false, error: `源 DesignCopy ${source.id} 缺少 Player 主控成员` };
	}
	try {
		primary.behavior = compileRecordedActionsToMemberBehavior(selectAcceptedRunInputs(record.output.inputs));
		return { ok: true, copy: createDesignCopy(draft, source.id) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}
