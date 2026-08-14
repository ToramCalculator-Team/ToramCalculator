import { z } from "zod/v4";

/**
 * 可由逻辑引擎与渲染 Worker 独立重建的确定性地形定义。
 * algorithmVersion 是生成结果兼容边界；算法变化时必须递增，不能让相同定义静默产生不同世界。
 */
export const TerrainDefinitionSchema = z
	.object({
		algorithmVersion: z.literal(1),
		seed: z.union([z.string(), z.number().finite()]),
		chunkSize: z.number().finite().positive(),
		chunkResolution: z.number().int().min(2),
		heightScale: z.number().finite().nonnegative(),
	})
	.strict();

export type TerrainDefinition = z.output<typeof TerrainDefinitionSchema>;

export const DEFAULT_WORLD_SEED = "toram-calculator";

export const DEFAULT_TERRAIN_DEFINITION: TerrainDefinition = Object.freeze({
	algorithmVersion: 1,
	seed: DEFAULT_WORLD_SEED,
	chunkSize: 32,
	chunkResolution: 17,
	heightScale: 4,
});
