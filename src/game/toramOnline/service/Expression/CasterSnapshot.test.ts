import { describe, expect, it, vi } from "vitest";
import { createExpressionSelf } from "./CasterSnapshot";

describe("CasterSnapshot", () => {
	it("暴露与表达式转换器一致的 attributeContainer 读取面", () => {
		const onMissing = vi.fn();
		const expressionSelf = createExpressionSelf({ "atk.m": 1200, _int: 255 }, onMissing);

		expect(expressionSelf.attributeContainer.getValue("atk.m")).toBe(1200);
		expect(expressionSelf.attributeContainer.getBaseValue("int")).toBe(255);
		expect(expressionSelf.attributeContainer.getValue("missing")).toBe(0);
		expect(onMissing).toHaveBeenCalledWith("missing");
	});
});
