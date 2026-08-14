import { type TerrainDefinition, TerrainDefinitionSchema } from "./terrainDefinition";

export interface TerrainChunkKey {
	readonly x: number;
	readonly z: number;
}

export interface TerrainChunkData {
	readonly key: TerrainChunkKey;
	readonly originX: number;
	readonly originZ: number;
	readonly size: number;
	readonly resolution: number;
	readonly heights: Float32Array;
}

export interface PhysicalTerrainGenerator {
	readonly definition: TerrainDefinition;
	sampleHeight(x: number, z: number): number;
	generateChunk(key: TerrainChunkKey): TerrainChunkData;
}

/**
 * 创建逻辑与渲染共用的纯地形生成器。
 *
 * 生成结果只由版本化定义和世界坐标决定，因此引擎可以同步点采样，渲染 Worker 可以并行生成任意区块。
 */
export function createPhysicalTerrainGenerator(input: TerrainDefinition): PhysicalTerrainGenerator {
	const definition = TerrainDefinitionSchema.parse(input);
	const seed = normalizeSeed(definition.seed);

	return {
		definition,
		sampleHeight: (x, z) => sampleHeight(x, z, seed, definition.heightScale),
		generateChunk: (key) => generateChunk(key, definition, seed),
	};
}

function generateChunk(key: TerrainChunkKey, definition: TerrainDefinition, seed: number): TerrainChunkData {
	const resolution = definition.chunkResolution;
	const step = definition.chunkSize / (resolution - 1);
	const heights = new Float32Array(resolution * resolution);
	const originX = key.x * definition.chunkSize;
	const originZ = key.z * definition.chunkSize;

	for (let z = 0; z < resolution; z += 1) {
		for (let x = 0; x < resolution; x += 1) {
			heights[z * resolution + x] = sampleHeight(
				originX + x * step,
				originZ + z * step,
				seed,
				definition.heightScale,
			);
		}
	}

	return {
		key,
		originX,
		originZ,
		size: definition.chunkSize,
		resolution,
		heights,
	};
}

function sampleHeight(x: number, z: number, seed: number, heightScale: number): number {
	const broad = valueNoise(x * 0.025, z * 0.025, seed) * 2 - 1;
	const detail = valueNoise(x * 0.09, z * 0.09, seed + 17) * 2 - 1;
	return (broad * 0.78 + detail * 0.22) * heightScale;
}

function valueNoise(x: number, z: number, seed: number): number {
	const x0 = Math.floor(x);
	const z0 = Math.floor(z);
	const tx = smoothStep(x - x0);
	const tz = smoothStep(z - z0);
	const x1 = x0 + 1;
	const z1 = z0 + 1;
	const h00 = hash2d(x0, z0, seed);
	const h10 = hash2d(x1, z0, seed);
	const h01 = hash2d(x0, z1, seed);
	const h11 = hash2d(x1, z1, seed);
	const hx0 = h00 + (h10 - h00) * tx;
	const hx1 = h01 + (h11 - h01) * tx;
	return hx0 + (hx1 - hx0) * tz;
}

function hash2d(x: number, z: number, seed: number): number {
	let value = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
	value = Math.imul(value ^ (value >>> 13), 1274126177);
	value ^= value >>> 16;
	return (value >>> 0) / 4294967295;
}

function smoothStep(value: number): number {
	return value * value * (3 - 2 * value);
}

function normalizeSeed(seed: string | number): number {
	if (typeof seed === "number" && Number.isFinite(seed)) return seed | 0;
	const text = String(seed);
	let hash = 2166136261;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash | 0;
}
