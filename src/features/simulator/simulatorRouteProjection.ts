export type SimulatorRouteDataStatus = "loading" | "available" | "missing";
export type SimulatorRouteSessionPhase = "inactive" | "ready" | "busy" | "transitioning";

export type SimulatorRouteProjection =
	| { kind: "loading"; requestInitialLoad: boolean }
	| { kind: "current" }
	| { kind: "mismatch"; currentSimulatorId: string; canSwitch: boolean }
	| { kind: "missing"; currentSimulatorId: string | null }
	| { kind: "transitioning"; currentSimulatorId: string | null };

/**
 * 将 URL 目标、持久设计可用性和常驻 Session 身份投影为页面状态。
 * URL 不授权破坏性切换；只有 mismatch 页面上的显式命令可以发起 switch。
 */
export function selectSimulatorRouteProjection(input: {
	targetSimulatorId: string | null;
	dataStatus: SimulatorRouteDataStatus;
	sessionSimulatorId: string | null;
	sessionPhase: SimulatorRouteSessionPhase;
}): SimulatorRouteProjection {
	if (!input.targetSimulatorId || input.dataStatus === "loading") {
		return { kind: "loading", requestInitialLoad: false };
	}
	if (input.dataStatus === "missing") {
		return { kind: "missing", currentSimulatorId: input.sessionSimulatorId };
	}
	if (input.sessionPhase === "inactive") {
		return { kind: "loading", requestInitialLoad: true };
	}
	if (input.sessionPhase === "transitioning") {
		return { kind: "transitioning", currentSimulatorId: input.sessionSimulatorId };
	}
	if (input.sessionSimulatorId === input.targetSimulatorId) return { kind: "current" };
	if (!input.sessionSimulatorId) {
		return { kind: "transitioning", currentSimulatorId: null };
	}
	return {
		kind: "mismatch",
		currentSimulatorId: input.sessionSimulatorId,
		canSwitch: input.sessionPhase === "ready",
	};
}
