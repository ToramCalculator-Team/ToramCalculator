import { createLogger } from "~/lib/logger";
import { createPhysicalTerrainGenerator, type PhysicalTerrainGenerator } from "~/lib/terrain";
import type { Color3, Scene, Vector3 } from "~/platform/render/babylon/runtime";
import { createTerrainRenderer, type TerrainRenderer } from "./terrainRenderer";
import type { WorldTerrainConfig } from "./worldConfig";
import { startTerrainGenerationClient, type TerrainGenerationClient } from "./worldGeneration";

const log = createLogger("WorldTerrain");

export type TerrainHeightSampler = (x: number, z: number) => number;

export function createTerrainHeightSampler(
	generator: Pick<PhysicalTerrainGenerator, "sampleHeight">,
): TerrainHeightSampler {
	return (x, z) => generator.sampleHeight(x, z);
}

/**
 * 无限地形的运行时外壳。
 *
 * 生成器以世界坐标为输入，Worker 按区块返回高度数据；渲染器只维护相机附近的有限区块。
 * 物理侧可直接消费 generator.sampleHeight / generateChunk，不依赖 Babylon 实例。
 */
export class WorldTerrain {
	readonly generator: PhysicalTerrainGenerator;
	readonly getHeightAt: TerrainHeightSampler;
	private readonly generationClient: TerrainGenerationClient;
	private readonly renderer: TerrainRenderer;
	private disposed = false;

	private constructor(readonly config: WorldTerrainConfig) {
		this.generator = createPhysicalTerrainGenerator(config.definition);
		this.getHeightAt = createTerrainHeightSampler(this.generator);
		this.generationClient = startTerrainGenerationClient(config.definition);
		this.renderer = createTerrainRenderer({
			definition: config.definition,
			renderConfig: config.render,
			generator: this.generationClient,
		});
	}

	static start(config: WorldTerrainConfig): WorldTerrain {
		return new WorldTerrain(config);
	}

	async mount(scene: Scene): Promise<void> {
		if (this.disposed) throw new Error("WorldTerrain 已销毁，不能再次挂载");
		this.renderer.mount(scene);
		log.info("无限地形渲染器已挂载");
	}

	update(cameraPosition: Vector3, revealCenter: Vector3 = cameraPosition): void {
		if (this.disposed) return;
		this.renderer.update(cameraPosition, revealCenter);
	}

	/** 更新渲染材质颜色；地形高度与区块生成数据不受显示主题影响。 */
	setRenderColors(mainColor: Color3, lineColor: Color3, fogColor: Color3): void {
		if (this.disposed) return;
		this.renderer.setColors(mainColor, lineColor, fogColor);
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.renderer.dispose();
		this.generationClient.dispose();
	}
}
