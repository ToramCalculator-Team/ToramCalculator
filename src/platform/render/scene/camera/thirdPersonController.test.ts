import { describe, expect, it } from "vitest";
import { computeTerrainCollisionLimit } from "./thirdPersonController";

const flatGround = () => 0;
const downDirection = { x: 0, y: -1, z: 0 } as const;
const upDirection = { x: 0, y: 1, z: 0 } as const;

describe("computeTerrainCollisionLimit", () => {
	it("返回视线首次接触地形前的安全距离", () => {
		const limit = computeTerrainCollisionLimit({ x: 0, y: 1, z: 0 }, downDirection, 8, 8, flatGround);

		expect(limit).toBeGreaterThan(0.89);
		expect(limit).toBeLessThan(0.91);
	});

	it("视线没有接触地形时返回 Infinity", () => {
		expect(computeTerrainCollisionLimit({ x: 0, y: 1, z: 0 }, upDirection, 8, 8, flatGround)).toBe(
			Number.POSITIVE_INFINITY,
		);
	});

	it("目标已经位于地形下方时不伪造可用的最小距离", () => {
		expect(computeTerrainCollisionLimit({ x: 0, y: -1, z: 0 }, downDirection, 8, 8, flatGround)).toBe(0);
	});
});
