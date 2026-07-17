export type SimulatorPerformanceOperation = "finish-to-analysis" | "return-to-design";

const measureName = (operation: SimulatorPerformanceOperation) => `simulator:${operation}`;
const startMarkName = (operation: SimulatorPerformanceOperation) => `${measureName(operation)}:start`;
const endMarkName = (operation: SimulatorPerformanceOperation) => `${measureName(operation)}:end`;

export function beginSimulatorPerformanceMeasure(operation: SimulatorPerformanceOperation, runId: string): void {
	if (typeof performance === "undefined") return;
	const start = startMarkName(operation);
	performance.clearMarks(start);
	performance.clearMarks(endMarkName(operation));
	performance.mark(start, { detail: { runId } });
}

function completeSimulatorPerformanceMeasure(operation: SimulatorPerformanceOperation): PerformanceMeasure | null {
	if (typeof performance === "undefined") return null;
	const start = startMarkName(operation);
	// getEntriesByName 的标准返回类型会丢失按 entryType 已知的 PerformanceMark 细化。
	const startEntry = performance.getEntriesByName(start, "mark").at(-1) as PerformanceMark | undefined;
	if (!startEntry) return null;
	const end = endMarkName(operation);
	performance.mark(end);
	const measure = performance.measure(measureName(operation), {
		start,
		end,
		detail: startEntry.detail,
	});
	performance.clearMarks(start);
	performance.clearMarks(end);
	if (import.meta.env.DEV && typeof window !== "undefined") {
		console.info("[Simulator][Performance]", {
			name: measure.name,
			durationMs: measure.duration,
			runId: startEntry.detail?.runId,
		});
	}
	return measure;
}

/** 两次绘制后结束计时，避免把组件挂载误当成界面已经可交互。 */
export function completeSimulatorPerformanceMeasureAfterPaint(
	operation: SimulatorPerformanceOperation,
	afterComplete?: (measure: PerformanceMeasure | null) => void,
): void {
	const complete = () => {
		const measure = completeSimulatorPerformanceMeasure(operation);
		afterComplete?.(measure);
	};
	if (typeof requestAnimationFrame === "undefined") {
		complete();
		return;
	}
	requestAnimationFrame(() => {
		requestAnimationFrame(complete);
	});
}
