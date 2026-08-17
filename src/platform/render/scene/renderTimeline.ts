import type { WorldStateSnapshot } from "~/engine/core/thread/worldStateBuffer";

/** Window 和 Worker 通过 timeOrigin 坐标比较同一会话内的单调时间样本。 */
export function monotonicEpochNowMs(): number {
	return performance.timeOrigin + performance.now();
}

/**
 * 把 Worker 提交的 Virtual Time 映射到当前渲染帧。
 * 默认落后一个 Fixed Tick 做插值；Worker 延迟时只允许最多一个 Tick 的外推。
 */
export function resolveRenderLogicalTime(snapshot: WorldStateSnapshot, sampledAtEpochMs: number): number {
	const clock = snapshot.clock;
	if (clock.state !== "running") return snapshot.logicalTimeMs;
	const elapsedMs = Math.max(0, sampledAtEpochMs - clock.sampledAtEpochMs);
	const timelineNowMs = clock.timelineTimeMs + elapsedMs * clock.timeScale;
	const interpolationTargetMs = Math.max(0, timelineNowMs - clock.fixedStepMs);
	return Math.min(interpolationTargetMs, snapshot.logicalTimeMs + clock.fixedStepMs);
}

/** 离散状态在 latest 的逻辑时刻才切换；该时刻之前继续使用 previous。 */
export function resolveRenderStateSnapshot(
	previous: WorldStateSnapshot | null,
	latest: WorldStateSnapshot,
	renderLogicalTimeMs: number,
): WorldStateSnapshot {
	if (previous && previous.logicalTimeMs <= latest.logicalTimeMs && renderLogicalTimeMs < latest.logicalTimeMs) {
		return previous;
	}
	return latest;
}
