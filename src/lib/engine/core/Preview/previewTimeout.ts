const PREVIEW_FAST_FORWARD_MIN_TIMEOUT_MS = 20_000;
const PREVIEW_FAST_FORWARD_GRACE_MS = 5_000;
const PREVIEW_FAST_FORWARD_MAX_TIMEOUT_MS = 30_000;

export function resolvePreviewFastForwardTimeoutMs(activeEffectDurationMs?: number): number {
	const declaredDuration = Number.isFinite(activeEffectDurationMs) ? Math.max(0, activeEffectDurationMs ?? 0) : 0;
	// 设计说明：超时只防止非终止行为树拖死预览；真实技能动作可达 10s，阈值必须高于声明生命周期并保留延迟伤害余量。
	return Math.min(
		PREVIEW_FAST_FORWARD_MAX_TIMEOUT_MS,
		Math.max(PREVIEW_FAST_FORWARD_MIN_TIMEOUT_MS, declaredDuration + PREVIEW_FAST_FORWARD_GRACE_MS),
	);
}
