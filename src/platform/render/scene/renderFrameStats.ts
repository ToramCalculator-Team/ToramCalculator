/**
 * 渲染帧率诊断统计。
 *
 * 只保存累计量与最近一帧耗时，不产生高频响应式更新；
 * 排查卡顿时可在任意位置调用 `getRenderFrameStats()` 读取。
 */

export type RenderFrameStats = {
	/** 累计渲染帧数 */
	frameCount: number;
	/** 累计渲染时间（秒） */
	totalTimeSec: number;
	/** 平均 FPS */
	averageFps: number;
	/** 平均帧耗时（毫秒） */
	averageFrameMs: number;
	/** 最近一帧耗时（毫秒） */
	lastFrameMs: number;
};

let stats: RenderFrameStats = {
	frameCount: 0,
	totalTimeSec: 0,
	averageFps: 0,
	averageFrameMs: 0,
	lastFrameMs: 0,
};

export function recordRenderFrame(dtSec: number): void {
	const dt = Math.max(0, dtSec);
	stats.frameCount += 1;
	stats.totalTimeSec += dt;
	stats.lastFrameMs = dt * 1000;
	if (stats.totalTimeSec > 0) {
		stats.averageFps = stats.frameCount / stats.totalTimeSec;
		stats.averageFrameMs = (stats.totalTimeSec / stats.frameCount) * 1000;
	}
}

export function getRenderFrameStats(): RenderFrameStats {
	return { ...stats };
}

export function resetRenderFrameStats(): void {
	stats = {
		frameCount: 0,
		totalTimeSec: 0,
		averageFps: 0,
		averageFrameMs: 0,
		lastFrameMs: 0,
	};
}
