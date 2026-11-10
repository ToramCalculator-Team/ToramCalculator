import type { PipelineInstructionData, PipelinePatchEffect, RegistletValue } from "@db/schema/jsons";
import { createLogger } from "~/lib/logger";
import type { PipelineInstruction } from "../../../../Pipeline/instruction";
import type { PipelineOverlay } from "../../../../Pipeline/overlay";
import type { RuntimeAttachment, RuntimeAttachmentMember } from "../RuntimeAttachment";
import { runtimeAttachmentLevel, runtimeAttachmentSourceId } from "../RuntimeAttachmentSource";

const log = createLogger("RuntimeAttachmentPipelineInstaller");

/** Pipeline operand 允许使用来源等级占位符，替换后将纯数字恢复为数字字面量。 */
function substituteLevel(value: RegistletValue, level: number): string | number | boolean {
	if (typeof value !== "string") return value;
	return value.replace(/\{level\}/g, String(level)).replace(/\{levelRate\}/g, String(level / 100));
}

function substituteOperand(op: string | number | undefined, level: number): string | number | undefined {
	if (op === undefined || typeof op === "number") return op;
	const replaced = substituteLevel(op, level);
	if (typeof replaced === "boolean") return replaced ? 1 : 0;
	if (typeof replaced === "number") return replaced;
	const trimmed = replaced.trim();
	const numeric = Number(trimmed);
	return trimmed.length > 0 && Number.isFinite(numeric) ? numeric : replaced;
}

function buildInstruction(data: PipelineInstructionData, level: number): PipelineInstruction {
	return {
		target: data.target,
		op: data.op as PipelineInstruction["op"],
		a: substituteOperand(data.a, level) as PipelineInstruction["a"],
		b: substituteOperand(data.b, level),
	};
}

/** 将一个 attachment 的 patch 声明转换为成员级 Pipeline overlay。 */
function buildOverlay(
	patch: PipelinePatchEffect,
	sourceId: string,
	sourceType: string,
	level: number,
): PipelineOverlay | null {
	const instructions: PipelineInstruction[] = [];
	for (const step of patch.steps) {
		if (step.type === "insertInstructions") {
			instructions.push(...step.instructions.map((instruction) => buildInstruction(instruction, level)));
		} else {
			log.warn(`暂未实现的 patch step 类型 ${step.type}，跳过 (sourceId=${sourceId})`);
		}
	}
	if (instructions.length === 0) return null;
	return {
		id: `${sourceId}.${patch.pipelineName}.${patch.slot}`,
		scope: "member",
		sourceType: sourceType,
		sourceId,
		priority: patch.priority,
		revision: 1,
		pipelineName: patch.pipelineName,
		operations: [
			{ kind: patch.position === "before" ? "insertBefore" : "insertAfter", anchor: patch.slot, instructions },
		],
	};
}

/** 安装当前来源的全部 overlay；卸载由 sourceId 统一完成。 */
export function installPipelinePatches<TAttrKey extends string>(
	member: RuntimeAttachmentMember<TAttrKey>,
	attachment: RuntimeAttachment<TAttrKey>,
): void {
	const sourceId = runtimeAttachmentSourceId(attachment.source);
	const level = runtimeAttachmentLevel(attachment.source);
	for (const patch of attachment.pipelinePatches ?? []) {
		const overlay = buildOverlay(patch, sourceId, attachment.source.type, level);
		if (overlay) member.pipelineOverlays.push(overlay);
	}
}

/** 移除该来源及其派生 overlay，避免残留旧 pipeline 版本。 */
export function uninstallPipelinePatches(member: RuntimeAttachmentMember, sourceId: string): void {
	member.pipelineOverlays = member.pipelineOverlays.filter(
		(overlay) => overlay.sourceId !== sourceId && !overlay.sourceId.startsWith(`${sourceId}.`),
	);
}
