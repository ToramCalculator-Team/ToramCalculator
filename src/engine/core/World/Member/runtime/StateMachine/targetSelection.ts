import type { MemberDomainEvent } from "../../../../types";
import type { MemberRuntimeServices } from "../../RuntimeServices";
import type { MemberSelectTargetEvent } from "./types";

type TargetSelectionEnv = {
	id: string;
	runtime: { targetId: string | null };
	services: Pick<MemberRuntimeServices, "targetResolver">;
	notifyDomainEvent(event: MemberDomainEvent): void;
};

/**
 * 执行 Member 的权威目标切换并发布最终判决。
 * 只有 `runtime.targetId` 实际改变后才接纳；无效目标和重复选择都保留为拒绝输入。
 */
export function applyMemberTargetSelection(env: TargetSelectionEnv, event: MemberSelectTargetEvent): void {
	const requestedTargetId = event.data.targetId;
	const resolvedTargetId = env.services.targetResolver
		? env.services.targetResolver(env.id, requestedTargetId)
		: requestedTargetId;
	if (!resolvedTargetId) {
		env.notifyDomainEvent({
			type: "target_selection_rejected",
			memberId: env.id,
			requestedTargetId,
			inputId: event.id,
			reason: "target_not_found",
		});
		return;
	}
	if (env.runtime.targetId === resolvedTargetId) {
		env.notifyDomainEvent({
			type: "target_selection_rejected",
			memberId: env.id,
			requestedTargetId,
			inputId: event.id,
			reason: "target_unchanged",
		});
		return;
	}

	env.runtime.targetId = resolvedTargetId;
	env.notifyDomainEvent({
		type: "target_selection_accepted",
		memberId: env.id,
		targetId: resolvedTargetId,
		inputId: event.id,
	});
}
