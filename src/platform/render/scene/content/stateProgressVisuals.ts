import type { WorldStateMember } from "~/engine/core/thread/worldStateBuffer";
import { worldStateStringId } from "~/engine/core/thread/worldStateBuffer";
import type { MemberStateName } from "~/engine/core/World/Member/runtime/State/MemberState";

export type StateProgressVisualDefinition = {
	state: MemberStateName;
	stateId: number;
	color: readonly [red: number, green: number, blue: number];
};

const defineStateProgressVisual = (
	state: MemberStateName,
	color: StateProgressVisualDefinition["color"],
): StateProgressVisualDefinition => ({ state, stateId: worldStateStringId(state), color });

/** 只有需要读取逻辑阶段进度的状态进入此表；新增表现不改变 SAB 协议。 */
export const STATE_PROGRESS_VISUALIZERS: readonly StateProgressVisualDefinition[] = [
	defineStateProgressVisual("skill.chanting", [0.16, 0.75, 1]),
	defineStateProgressVisual("skill.charging", [1, 0.65, 0.12]),
];

export type ResolvedStateProgressVisual = {
	definition: StateProgressVisualDefinition;
	progress: number;
};

/** 按当前技能生命周期和状态起始时间计算阶段进度；无活动技能或无正时长时不创建表现。 */
export function resolveStateProgressVisual(
	member: WorldStateMember,
	renderLogicalTimeMs: number,
	definitions: readonly StateProgressVisualDefinition[] = STATE_PROGRESS_VISUALIZERS,
): ResolvedStateProgressVisual | null {
	if (!member.active) return null;
	const definition = definitions.find((candidate) => candidate.stateId === member.state.id);
	if (!definition) return null;
	const startedAt = member.state.startedAtLogicalTimeMs;
	const lifecycle = member.skillExecution?.lifecycle;
	if (!lifecycle || !Number.isFinite(startedAt)) return null;
	const durationMs = definition.state === "skill.chanting" ? lifecycle.chanting : lifecycle.charging;
	if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
	const progress = (renderLogicalTimeMs - startedAt) / durationMs;
	return { definition, progress: Math.min(1, Math.max(0, progress)) };
}
