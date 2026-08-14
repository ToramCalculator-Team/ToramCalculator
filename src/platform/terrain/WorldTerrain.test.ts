import { describe, expect, it } from "vitest";
import { createPhysicalTerrainGenerator } from "~/lib/terrain";
import { createTerrainHeightSampler } from "./WorldTerrain";

const CONFIG = {
	algorithmVersion: 1,
	seed: "sampler-test",
	chunkSize: 32,
	chunkResolution: 9,
	heightScale: 4,
} as const;

describe("createPhysicalTerrainGenerator", () => {
	it("按世界坐标返回有限高度，不受有限世界边界限制", () => {
		const generator = createPhysicalTerrainGenerator(CONFIG);
		const sampler = createTerrainHeightSampler(generator);

		for (const [x, z] of [
			[0, 0],
			[-32, 16],
			[100000, -100000],
			[10.5, -10.5],
		] as const) {
			expect(Number.isFinite(sampler(x, z))).toBe(true);
			expect(Math.abs(sampler(x, z))).toBeLessThanOrEqual(CONFIG.heightScale);
		}
	});

	it("同一个种子在远处区块也保持确定性", () => {
		const first = createPhysicalTerrainGenerator(CONFIG);
		const second = createPhysicalTerrainGenerator(CONFIG);
		const firstChunk = first.generateChunk({ x: -17, z: 23 });
		const secondChunk = second.generateChunk({ x: -17, z: 23 });

		expect(Array.from(firstChunk.heights)).toEqual(Array.from(secondChunk.heights));
		expect(first.sampleHeight(100000.25, -100000.75)).toBe(second.sampleHeight(100000.25, -100000.75));
	});

	it("相邻区块共享边界高度", () => {
		const generator = createPhysicalTerrainGenerator(CONFIG);
		const left = generator.generateChunk({ x: 0, z: 0 });
		const right = generator.generateChunk({ x: 1, z: 0 });
		const last = CONFIG.chunkResolution - 1;

		for (let z = 0; z < CONFIG.chunkResolution; z += 1) {
			expect(left.heights[z * CONFIG.chunkResolution + last]).toBe(
				right.heights[z * CONFIG.chunkResolution],
			);
		}
	});
});
