import { describe, expect, it } from "vitest";
import { selectSimulatorRouteProjection } from "./simulatorRouteProjection";

describe("Simulator 路由投影", () => {
	it("首次深链接只在目标已解析且 Session inactive 时请求初始装载", () => {
		expect(
			selectSimulatorRouteProjection({
				targetSimulatorId: "sim-b",
				dataStatus: "loading",
				sessionSimulatorId: null,
				sessionPhase: "inactive",
			}),
		).toEqual({ kind: "loading", requestInitialLoad: false });
		expect(
			selectSimulatorRouteProjection({
				targetSimulatorId: "sim-b",
				dataStatus: "available",
				sessionSimulatorId: null,
				sessionPhase: "inactive",
			}),
		).toEqual({ kind: "loading", requestInitialLoad: true });
	});

	it("同一 Session 身份直接渲染当前会话", () => {
		expect(
			selectSimulatorRouteProjection({
				targetSimulatorId: "sim-a",
				dataStatus: "available",
				sessionSimulatorId: "sim-a",
				sessionPhase: "busy",
			}),
		).toEqual({ kind: "current" });
	});

	it("A/B 失配保留 A，并且只有 ready Session 可显式切换", () => {
		expect(
			selectSimulatorRouteProjection({
				targetSimulatorId: "sim-b",
				dataStatus: "available",
				sessionSimulatorId: "sim-a",
				sessionPhase: "ready",
			}),
		).toEqual({ kind: "mismatch", currentSimulatorId: "sim-a", canSwitch: true });
		expect(
			selectSimulatorRouteProjection({
				targetSimulatorId: "sim-b",
				dataStatus: "available",
				sessionSimulatorId: "sim-a",
				sessionPhase: "busy",
			}),
		).toEqual({ kind: "mismatch", currentSimulatorId: "sim-a", canSwitch: false });
	});

	it("目标缺失或 Session 正在切换时不形成新的切换命令", () => {
		expect(
			selectSimulatorRouteProjection({
				targetSimulatorId: "missing",
				dataStatus: "missing",
				sessionSimulatorId: "sim-a",
				sessionPhase: "ready",
			}),
		).toEqual({ kind: "missing", currentSimulatorId: "sim-a" });
		expect(
			selectSimulatorRouteProjection({
				targetSimulatorId: "sim-b",
				dataStatus: "available",
				sessionSimulatorId: "sim-a",
				sessionPhase: "transitioning",
			}),
		).toEqual({ kind: "transitioning", currentSimulatorId: "sim-a" });
	});
});
