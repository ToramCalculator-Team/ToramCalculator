import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { describe, expect, it } from "vitest";
import type { TerrainChunkData, TerrainDefinition } from "~/lib/terrain";
import { Scene, StandardMaterial, Vector3 } from "~/platform/render/babylon/runtime";
import { createTerrainRenderer } from "./terrainRenderer";

const DEFINITION: TerrainDefinition = {
	algorithmVersion: 1,
	seed: "terrain-renderer-test",
	chunkSize: 8,
	chunkResolution: 2,
	heightScale: 0,
};

describe("TerrainRenderer", () => {
	it("创建可接收阴影的标准材质地形区块", async () => {
		const engine = new NullEngine();
		const scene = new Scene(engine);
		const chunk: TerrainChunkData = {
			key: { x: 0, z: 0 },
			originX: 0,
			originZ: 0,
			size: DEFINITION.chunkSize,
			resolution: DEFINITION.chunkResolution,
			heights: new Float32Array([0, 0, 0, 0]),
		};
		const renderer = createTerrainRenderer({
			definition: DEFINITION,
			renderConfig: { renderRadius: 0 },
			generator: { generateChunk: () => chunk },
		});

		renderer.mount(scene);
		renderer.update(Vector3.Zero());
		await Promise.resolve();

		const terrain = scene.getMeshByName("terrain:0:0");
		expect(terrain?.receiveShadows).toBe(true);
		expect(terrain?.material).toBeInstanceOf(StandardMaterial);
		expect(terrain?.material?.pluginManager?.getPlugin("TerrainGrid")).toBeDefined();

		renderer.dispose();
		scene.dispose();
		engine.dispose();
	});
});
