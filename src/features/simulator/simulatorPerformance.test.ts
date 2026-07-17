import { afterEach, describe, expect, it } from "vitest";
import {
	beginSimulatorPerformanceMeasure,
	completeSimulatorPerformanceMeasureAfterPaint,
} from "./simulatorPerformance";

describe("Simulator performance checkpoints", () => {
	afterEach(() => {
		performance.clearMarks();
		performance.clearMeasures();
	});

	it("完成计时后保留带 runId 的标准 measure", () => {
		beginSimulatorPerformanceMeasure("finish-to-analysis", "run-1");
		let completedMeasure: PerformanceMeasure | null | undefined;
		completeSimulatorPerformanceMeasureAfterPaint("finish-to-analysis", (measure) => {
			completedMeasure = measure;
		});
		const entry = performance.getEntriesByName("simulator:finish-to-analysis", "measure").at(-1);

		expect(completedMeasure).toBe(entry);
		expect(entry?.duration).toBeGreaterThanOrEqual(0);
		expect(entry && "detail" in entry ? entry.detail : undefined).toEqual({ runId: "run-1" });
	});
});
