import { describe, expect, it } from "vitest";
import { StateAnimationRangeSchema } from "./worldResource";

describe("StateAnimationRangeSchema", () => {
	it("接受正向或单点的归一化动画区间", () => {
		expect(StateAnimationRangeSchema.safeParse({ start: 0, end: 0.5 }).success).toBe(true);
		expect(StateAnimationRangeSchema.safeParse({ start: 0.5, end: 0.5 }).success).toBe(true);
	});

	it("拒绝越界或倒序的动画区间", () => {
		expect(StateAnimationRangeSchema.safeParse({ start: -0.1, end: 0.5 }).success).toBe(false);
		expect(StateAnimationRangeSchema.safeParse({ start: 0.6, end: 0.5 }).success).toBe(false);
		expect(StateAnimationRangeSchema.safeParse({ start: 0.5, end: 1.1 }).success).toBe(false);
	});
});
