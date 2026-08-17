import { describe, expect, it } from "vitest";
import { resolveStarTextureLevel } from "./proceduralStarSkybox";

describe("ProceduralStarSkybox", () => {
	it("只在深色模式更新星空亮度", () => {
		expect(resolveStarTextureLevel(2, false)).toBe(0);
		for (let seconds = 0; seconds <= 120; seconds += 0.5) {
			expect(resolveStarTextureLevel(seconds, true)).toBeGreaterThanOrEqual(0.8);
			expect(resolveStarTextureLevel(seconds, true)).toBeLessThanOrEqual(1);
		}
	});
});
