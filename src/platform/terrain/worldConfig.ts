import type { TerrainDefinition } from "~/lib/terrain";

/** 渲染区块保留范围不是物理世界定义，由地形显示运行时单独拥有。 */
export interface TerrainRenderConfig {
	readonly renderRadius: number;
}

export interface WorldTerrainConfig {
	readonly definition: TerrainDefinition;
	readonly render: TerrainRenderConfig;
}

export const DEFAULT_TERRAIN_RENDER_CONFIG: TerrainRenderConfig = Object.freeze({ renderRadius: 4 });
