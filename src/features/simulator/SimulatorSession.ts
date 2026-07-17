/**
 * SimulatorSession child actor 的 SolidJS 只读投影。
 *
 * 本模块不创建、不复制也不清理会话状态；会话生命周期属于 AppActorProvider 启动的
 * XState child。CUI 从 actor snapshot 读取业务数据，并且只能发送公开的语义意图。
 */
import { fromActorRef } from "@xstate/solid";
import { type Accessor, createMemo, createSignal, onCleanup } from "solid-js";
import type { EngineTelemetry } from "~/lib/engine/core/thread/protocol";
import type { SimulationRenderSource } from "~/lib/engine/core/thread/RendererProtocol";
import { readTickStateRange, readTickStateSnapshot, type TickStateSnapshot } from "~/lib/engine/core/tickStateHistory";
import type { FrameSnapshot } from "~/lib/engine/core/types";
import type { MemberSnapshot } from "~/lib/engine/core/World/Member/Member";
import { useSimulatorSessionActor, useSimulatorSessionRuntime } from "~/machines/AppActorContext";
import { analyzeRun, compareRuns, type RunComparison, type RunSummary } from "./analysis";
import { type DesignCopy, type DesignFieldDifference, diffDesignCopies } from "./designCopy";
import type { SimulationDesign } from "./simulationDesignSchema";
import { beginSimulatorPerformanceMeasure } from "./simulatorPerformance";
import {
	type SessionRunRecord,
	type SimulatorControllerBinding,
	type SimulatorSessionSnapshot,
	selectCurrentDesignCopy,
} from "./simulatorSessionMachine";
import type { SimulatorSessionIntent } from "./simulatorSessionProtocol";

export type SimulatorSessionValue = {
	snapshot: Accessor<SimulatorSessionSnapshot>;
	simulatorId: () => string | null;
	baseline: () => SimulationDesign | null;
	designCopies: () => DesignCopy[];
	currentDesignCopy: () => DesignCopy | null;
	runRecords: () => SessionRunRecord[];
	selectedRunIds: () => [string | null, string | null];
	members: () => MemberSnapshot[];
	controllers: () => SimulatorControllerBinding[];
	activeControllerId: () => string | null;
	activeSkills: () => Array<{ id: string; name: string; level: number }>;
	error: () => string | null;
	send: (intent: SimulatorSessionIntent) => void;
	readSummary: (runId: string) => RunSummary;
	readTick: (runId: string, tickIndex: number) => TickStateSnapshot;
	readTickRange: (runId: string, startTick: number, endTickExclusive: number) => TickStateSnapshot[];
	readComparison: () => RunComparison | null;
	previewCurrentDifferences: () => DesignFieldDifference[];
};

export type SimulatorRuntimeProjection = {
	latestFrame: () => FrameSnapshot | null;
	telemetry: () => EngineTelemetry | null;
	isRunning: () => boolean;
	renderSource: () => SimulationRenderSource;
};

/** 返回直接投影 child snapshot 的会话读面与语义意图入口。 */
export function useSimulatorSession(): SimulatorSessionValue {
	const actor = useSimulatorSessionActor();
	const snapshot = fromActorRef(actor);
	const currentDesignCopy = createMemo(() => selectCurrentDesignCopy(snapshot().context));
	const runRecord = (runId: string) => {
		const record = snapshot().context.runRecords.find((candidate) => candidate.id === runId);
		if (!record) throw new Error(`RunRecord 不存在: ${runId}`);
		return record;
	};
	const copyForRun = (runId: string) => {
		const record = runRecord(runId);
		const copy = snapshot().context.designCopies.find((candidate) => candidate.id === record.designCopyId);
		if (!copy) throw new Error(`RunRecord ${runId} 的 DesignCopy 不存在`);
		return copy;
	};

	return {
		snapshot,
		simulatorId: () => snapshot().context.simulatorId,
		baseline: () => snapshot().context.baseline,
		designCopies: () => snapshot().context.designCopies,
		currentDesignCopy,
		runRecords: () => snapshot().context.runRecords,
		selectedRunIds: () => snapshot().context.selectedRunIds,
		members: () => snapshot().context.members,
		controllers: () => snapshot().context.controllers,
		activeControllerId: () => snapshot().context.activeControllerId,
		activeSkills: () => snapshot().context.activeSkills,
		error: () => snapshot().context.error?.message ?? null,
		send: (intent) => {
			const context = snapshot().context;
			if (intent.type === "validation.finish.requested" && context.activeRun) {
				beginSimulatorPerformanceMeasure("finish-to-analysis", context.activeRun.runId);
			}
			if (intent.type === "validation.returnToDesign.requested") {
				const runId = context.activeRun?.runId ?? context.runRecords.at(-1)?.id ?? context.simulatorId;
				if (runId) beginSimulatorPerformanceMeasure("return-to-design", runId);
			}
			actor.send(intent);
		},
		readSummary: (runId) => {
			const record = runRecord(runId);
			return analyzeRun(copyForRun(runId).design, record.output);
		},
		readTick: (runId, tickIndex) => readTickStateSnapshot(runRecord(runId).output.stateHistory, tickIndex),
		readTickRange: (runId, startTick, endTickExclusive) =>
			readTickStateRange(runRecord(runId).output.stateHistory, startTick, endTickExclusive),
		readComparison: () => {
			const [aId, bId] = snapshot().context.selectedRunIds;
			if (!aId || !bId) return null;
			const a = runRecord(aId);
			const b = runRecord(bId);
			return compareRuns(copyForRun(aId).design, a.output, copyForRun(bId).design, b.output);
		},
		previewCurrentDifferences: () => {
			const baseline = snapshot().context.baseline;
			const current = currentDesignCopy();
			return baseline && current ? diffDesignCopies(baseline, current.design) : [];
		},
	};
}

/** SimulatorSession 自有实时租约的高频只读投影，不包含引擎命令。 */
export function useSimulatorRuntimeProjection(): SimulatorRuntimeProjection {
	const runtime = useSimulatorSessionRuntime();
	const [snapshot, setSnapshot] = createSignal(runtime.getRuntimeSnapshot());
	const release = runtime.subscribeRuntimeProjection(setSnapshot);
	onCleanup(release);
	return {
		latestFrame: () => snapshot().latestFrame,
		telemetry: () => snapshot().telemetry,
		isRunning: () => snapshot().isRunning,
		renderSource: () => runtime.renderSource,
	};
}
