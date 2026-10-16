import { describe, expect, it } from "vitest";
import type { PipelineOverlay } from "./overlay";
import { PipelineService } from "./PipelineService";
import { STANDARD_PIPELINES } from "./standard";

const memberLayer = { kind: "member" as const, id: "member-1" };

describe("PipelineService", () => {
	it("从静态标准管线推导名称并执行计算", () => {
		const service = new PipelineService(STANDARD_PIPELINES);
		service.setLayerChain([]);

		const result = service.run("skill.cost", {
			baseHpCost: 10,
			baseMpCost: 20,
			"self.skill.nextCost.mpCostRate": 0,
		});

		expect(result.hpCost).toBe(10);
		expect(result.mpCost).toBe(20);
		expect(service.getPipelineNames()).toContain("damageCalc");
	});

	it("按层级应用 overlay，并在来源更新后重建结果", () => {
		const service = new PipelineService({
			value: [{ target: "result", op: "+", a: "input.value", b: 1 }],
		} as const);
		service.setLayerChain([memberLayer]);

		const overlay: PipelineOverlay = {
			id: "source.value",
			sourceType: "test",
			sourceId: "source.value",
			priority: 0,
			pipelineName: "value",
			operations: [
				{
					kind: "replaceInstruction",
					target: "result",
					instruction: { target: "result", op: "+", a: "input.value", b: 2 },
				},
			],
		};

		expect(service.run("value", { value: 3 }).result).toBe(4);
		service.addOverlay(memberLayer, overlay);
		expect(service.run("value", { value: 3 }).result).toBe(5);
		service.removeOverlay(memberLayer, overlay.sourceId);
		expect(service.run("value", { value: 3 }).result).toBe(4);
	});

	it("在 overlay 锚点缺失时抛错", () => {
		const service = new PipelineService({
			value: [{ target: "result", op: "+", a: "input.value", b: 1 }],
		} as const);
		service.setLayerChain([memberLayer]);
		service.addOverlay(memberLayer, {
			id: "source.invalid",
			sourceType: "test",
			sourceId: "source.invalid",
			priority: 0,
			pipelineName: "value",
			operations: [{ kind: "insertAfter", anchor: "missing", instructions: [] }],
		});

		expect(() => service.run("value", { value: 3 })).toThrow(/missing/);
	});
});
