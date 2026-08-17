/**
 * 临时验证代码：诊断角色移动卡顿根因。
 *
 * 改进点：
 * 1. 按移动会话（session）分段统计，避免跨静止期的伪速度。
 * 2. 记录 SAB 权威位置跳变（logicalTimeMs 差分）以检测 tick 产出不均。
 * 3. 记录渲染帧时间（dtSec）分布。
 * 4. 记录逐帧 lag 时序快照（前 N 帧），观察 mesh 追赶模式。
 *
 * 验证完成后删除本文件，并在 RenderSyncSystem 中移除调用。
 */

type Vec3Like = { x: number; y: number; z: number };

type MovementSession = {
	sessionId: number;
	startFrame: number;
	frames: number;
	/** mesh 逐帧速度 */
	meshSpeeds: number[];
	/** SAB 权威位置逐帧跳变距离 */
	saDeltas: number[];
	/** logicalTimeMs 逐帧增量（ms） */
	logicalTimeDiffs: number[];
	/** 渲染帧时间 dtSec */
	renderDts: number[];
	/** mesh 与 SAB 位置差（lag） */
	lags: number[];
	/** 累积统计 */
	meshSpeedSum: number;
	meshSpeedSqSum: number;
	meshSpeedMin: number;
	meshSpeedMax: number;
	maxLag: number;
};

type EntityProbe = {
	currentSession: MovementSession | null;
	sessionSeq: number;
	lastMeshPos: Vec3Like | null;
	lastSaPos: Vec3Like | null;
	lastLogicalTimeMs: number | null;
	/** 已完成的会话 */
	completedSessions: MovementSession[];
};

const probes = new Map<string, EntityProbe>();
let globalFrameCount = 0;

/** 单个 session 保留的详细帧数上限（避免内存爆炸） */
const MAX_DETAIL_FRAMES = 300;

function distance(a: Vec3Like, b: Vec3Like): number {
	return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function createSession(sessionId: number, startFrame: number): MovementSession {
	return {
		sessionId,
		startFrame,
		frames: 0,
		meshSpeeds: [],
		saDeltas: [],
		logicalTimeDiffs: [],
		renderDts: [],
		lags: [],
		meshSpeedSum: 0,
		meshSpeedSqSum: 0,
		meshSpeedMin: Number.POSITIVE_INFINITY,
		meshSpeedMax: 0,
		maxLag: 0,
	};
}

export function recordMovementProbe(
	entityId: string,
	logicalTimeMs: number | null,
	saPos: Vec3Like,
	meshPos: Vec3Like,
	dtSec: number,
): void {
	globalFrameCount += 1;

	let probe = probes.get(entityId);
	if (!probe) {
		probe = {
			currentSession: null,
			sessionSeq: 0,
			lastMeshPos: null,
			lastSaPos: null,
			lastLogicalTimeMs: null,
			completedSessions: [],
		};
		probes.set(entityId, probe);
	}

	// 开启新会话
	if (!probe.currentSession) {
		probe.sessionSeq += 1;
		probe.currentSession = createSession(probe.sessionSeq, globalFrameCount);
	}

	const session = probe.currentSession;
	const lag = distance(meshPos, saPos);
	session.maxLag = Math.max(session.maxLag, lag);

	// 记录渲染帧时间
	if (dtSec > 0) {
		if (session.renderDts.length < MAX_DETAIL_FRAMES) {
			session.renderDts.push(dtSec);
		}
	}

	// 记录 lag
	if (session.lags.length < MAX_DETAIL_FRAMES) {
		session.lags.push(lag);
	}

	// 记录 mesh 速度（需要前一帧位置）
	if (probe.lastMeshPos && dtSec > 0) {
		const meshSpeed = distance(meshPos, probe.lastMeshPos) / dtSec;
		session.meshSpeedSum += meshSpeed;
		session.meshSpeedSqSum += meshSpeed * meshSpeed;
		session.meshSpeedMin = Math.min(session.meshSpeedMin, meshSpeed);
		session.meshSpeedMax = Math.max(session.meshSpeedMax, meshSpeed);
		session.frames += 1;

		if (session.meshSpeeds.length < MAX_DETAIL_FRAMES) {
			session.meshSpeeds.push(meshSpeed);
		}
	}

	// 记录 SAB 权威位置跳变
	if (probe.lastSaPos) {
		const saDelta = distance(saPos, probe.lastSaPos);
		if (session.saDeltas.length < MAX_DETAIL_FRAMES) {
			session.saDeltas.push(saDelta);
		}
	}

	// 记录 logicalTimeMs 增量
	if (logicalTimeMs !== null && probe.lastLogicalTimeMs !== null) {
		const timeDiff = logicalTimeMs - probe.lastLogicalTimeMs;
		if (session.logicalTimeDiffs.length < MAX_DETAIL_FRAMES) {
			session.logicalTimeDiffs.push(timeDiff);
		}
	}

	probe.lastMeshPos = { x: meshPos.x, y: meshPos.y, z: meshPos.z };
	probe.lastSaPos = { x: saPos.x, y: saPos.y, z: saPos.z };
	probe.lastLogicalTimeMs = logicalTimeMs;
}

/** 手动结束当前移动会话（例如 moving 变为 false 时调用） */
export function endMovementSession(entityId: string): void {
	const probe = probes.get(entityId);
	if (!probe || !probe.currentSession) return;

	// 保存会话到历史（保留最近 5 个）
	probe.completedSessions.push(probe.currentSession);
	if (probe.completedSessions.length > 5) {
		probe.completedSessions.shift();
	}
	probe.currentSession = null;
	probe.lastMeshPos = null;
	probe.lastSaPos = null;
	probe.lastLogicalTimeMs = null;
}

export function getMovementJitterStats(): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [entityId, probe] of probes) {
		const sessions = [...probe.completedSessions];
		if (probe.currentSession && probe.currentSession.frames > 10) {
			sessions.push(probe.currentSession);
		}

		const sessionStats = sessions.map((s) => {
			const mean = s.frames > 0 ? s.meshSpeedSum / s.frames : 0;
			const variance = s.frames > 0 ? Math.max(0, s.meshSpeedSqSum / s.frames - mean * mean) : 0;
			const stddev = Math.sqrt(variance);

			// 统计 logicalTimeMs 增量分布
			const timeDiffStats = s.logicalTimeDiffs.length > 0 ? analyzeDistribution(s.logicalTimeDiffs) : null;
			// 统计 SAB 位置跳变分布
			const saDeltaStats = s.saDeltas.length > 0 ? analyzeDistribution(s.saDeltas) : null;
			// 统计渲染帧时间分布
			const renderDtStats = s.renderDts.length > 0 ? analyzeDistribution(s.renderDts.map((dt) => dt * 1000)) : null;

			return {
				sessionId: s.sessionId,
				startFrame: s.startFrame,
				frames: s.frames,
				avgMeshSpeed: mean,
				speedStddev: stddev,
				speedCv: mean > 0 ? stddev / mean : 0,
				speedMin: Number.isFinite(s.meshSpeedMin) ? s.meshSpeedMin : 0,
				speedMax: s.meshSpeedMax,
				maxLag: s.maxLag,
				// 时序分布统计
				logicalTimeDiff: timeDiffStats,
				saDelta: saDeltaStats,
				renderDt: renderDtStats,
				// 逐帧快照（前 50 帧）
				detailSample: {
					meshSpeeds: s.meshSpeeds.slice(0, 50),
					saDeltas: s.saDeltas.slice(0, 50),
					lags: s.lags.slice(0, 50),
					logicalTimeDiffs: s.logicalTimeDiffs.slice(0, 50),
				},
			};
		});

		result[entityId] = { sessions: sessionStats };
	}
	return result;
}

function analyzeDistribution(values: number[]): {
	min: number;
	max: number;
	mean: number;
	median: number;
	stddev: number;
	p95: number;
	histogram: Record<string, number>;
} {
	if (values.length === 0) {
		return { min: 0, max: 0, mean: 0, median: 0, stddev: 0, p95: 0, histogram: {} };
	}

	const sorted = [...values].sort((a, b) => a - b);
	const min = sorted[0];
	const max = sorted[sorted.length - 1];
	const sum = sorted.reduce((acc, v) => acc + v, 0);
	const mean = sum / sorted.length;
	const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sorted.length;
	const stddev = Math.sqrt(variance);
	const median = sorted[Math.floor(sorted.length / 2)];
	const p95 = sorted[Math.floor(sorted.length * 0.95)];

	// 简单直方图（分 10 档）
	const histogram: Record<string, number> = {};
	const binCount = Math.min(10, sorted.length);
	const binSize = (max - min) / binCount;
	for (const value of sorted) {
		const binIndex = Math.min(binCount - 1, Math.floor((value - min) / (binSize || 1)));
		const binLabel = `${(min + binIndex * binSize).toFixed(2)}-${(min + (binIndex + 1) * binSize).toFixed(2)}`;
		histogram[binLabel] = (histogram[binLabel] || 0) + 1;
	}

	return { min, max, mean, median, stddev, p95, histogram };
}

export function resetMovementJitterProbe(): void {
	probes.clear();
	globalFrameCount = 0;
}

export function maybeLogMovementJitter(intervalFrames = 120): void {
	if (globalFrameCount % intervalFrames !== 0) return;
	const stats = getMovementJitterStats();
	if (Object.keys(stats).length === 0) return;
	console.info("[movement-jitter]", stats);
}

// 临时控制台入口：验证完成后随本文件删除。
if (typeof globalThis !== "undefined") {
	(globalThis as Record<string, unknown>).__movementJitterStats = getMovementJitterStats;
	(globalThis as Record<string, unknown>).__resetMovementJitterProbe = resetMovementJitterProbe;
	(globalThis as Record<string, unknown>).__endMovementSession = endMovementSession;
}
