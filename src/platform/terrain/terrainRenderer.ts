import { createLogger } from "~/lib/logger";
import type { TerrainChunkData, TerrainChunkKey, TerrainDefinition } from "~/lib/terrain";
import {
	Color3,
	Mesh,
	type Scene,
	StandardMaterial,
	type Vector3,
	VertexData,
} from "~/platform/render/babylon/runtime";
import { TerrainGridMaterialPlugin } from "./terrainGridMaterial";
import type { TerrainRenderConfig } from "./worldConfig";

const log = createLogger("TerrainRenderer");

export interface TerrainRenderer {
	mount(scene: Scene): void;
	setColors(mainColor: Color3, lineColor: Color3): void;
	update(cameraPosition: Vector3): void;
	dispose(): void;
}

type TerrainMaterial = {
	material: StandardMaterial;
	grid: TerrainGridMaterialPlugin;
};

type TerrainChunkGenerator = {
	generateChunk(key: TerrainChunkKey): TerrainChunkData | Promise<TerrainChunkData>;
};

export function createTerrainRenderer(options: {
	definition: TerrainDefinition;
	renderConfig: TerrainRenderConfig;
	generator: TerrainChunkGenerator;
}): TerrainRenderer {
	const meshes = new Map<string, Mesh>();
	const pending = new Map<string, Promise<void>>();
	let scene: Scene | null = null;
	let material: TerrainMaterial | null = null;
	let desired = new Set<string>();
	let disposed = false;

	const keyOf = (key: TerrainChunkKey): string => `${key.x}:${key.z}`;

	const removeChunk = (key: string) => {
		meshes.get(key)?.dispose();
		meshes.delete(key);
	};

	const ensureChunk = (key: TerrainChunkKey) => {
		if (!scene || !material || disposed) return;
		const id = keyOf(key);
		if (meshes.has(id) || pending.has(id)) return;

		const task = Promise.resolve(options.generator.generateChunk(key))
			.then((chunk) => {
				pending.delete(id);
				if (disposed || !desired.has(id) || !scene || !material) return;
				meshes.set(id, createChunkMesh(scene, material.material, chunk));
			})
			.catch((error) => {
				pending.delete(id);
				log.error(`区块生成失败: ${id}`, error);
			});
		pending.set(id, task);
	};

	return {
		mount(nextScene) {
			if (disposed) throw new Error("TerrainRenderer 已销毁");
			if (scene) throw new Error("TerrainRenderer 只能挂载一次");
			scene = nextScene;
			material = createTerrainMaterial(scene);
		},
		setColors(mainColor, lineColor) {
			if (!material || disposed) return;
			material.grid.mainColor.copyFrom(mainColor);
			material.grid.lineColor.copyFrom(lineColor);
		},
		update(cameraPosition) {
			if (disposed || !scene) return;
			const centerX = Math.floor(cameraPosition.x / options.definition.chunkSize);
			const centerZ = Math.floor(cameraPosition.z / options.definition.chunkSize);
			const nextDesired = new Set<string>();

			for (
				let z = centerZ - options.renderConfig.renderRadius;
				z <= centerZ + options.renderConfig.renderRadius;
				z += 1
			) {
				for (
					let x = centerX - options.renderConfig.renderRadius;
					x <= centerX + options.renderConfig.renderRadius;
					x += 1
				) {
					const key = { x, z };
					const id = keyOf(key);
					nextDesired.add(id);
					ensureChunk(key);
				}
			}

			for (const id of meshes.keys()) {
				if (!nextDesired.has(id)) removeChunk(id);
			}
			desired = nextDesired;
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			for (const id of meshes.keys()) removeChunk(id);
			pending.clear();
			material?.material.dispose();
			material = null;
			scene = null;
			desired.clear();
		},
	};
}

/** 使用 StandardMaterial 承接灯光与阴影，地形插件只负责生成世界网格基础色。 */
function createTerrainMaterial(scene: Scene): TerrainMaterial {
	const material = new StandardMaterial("terrain:grid-material", scene);
	material.diffuseColor = Color3.White();
	material.specularColor = Color3.Black();
	const grid = new TerrainGridMaterialPlugin(material);
	return { material, grid };
}

function createChunkMesh(scene: Scene, material: StandardMaterial, chunk: TerrainChunkData): Mesh {
	const positions: number[] = [];
	const indices: number[] = [];
	const uvs: number[] = [];
	const step = chunk.size / (chunk.resolution - 1);

	for (let z = 0; z < chunk.resolution; z += 1) {
		for (let x = 0; x < chunk.resolution; x += 1) {
			positions.push(x * step, chunk.heights[z * chunk.resolution + x], z * step);
			uvs.push(x / (chunk.resolution - 1), z / (chunk.resolution - 1));
		}
	}

	for (let z = 0; z < chunk.resolution - 1; z += 1) {
		for (let x = 0; x < chunk.resolution - 1; x += 1) {
			const topLeft = z * chunk.resolution + x;
			const topRight = topLeft + 1;
			const bottomLeft = topLeft + chunk.resolution;
			const bottomRight = bottomLeft + 1;
			// Babylon 的 ComputeNormals 对索引顺序取 p1-p2 与 p3-p2 的叉积；此顺序产生 +Y 法线。
			indices.push(bottomLeft, topLeft, topRight, topRight, bottomRight, bottomLeft);
		}
	}

	const normals: number[] = [];
	VertexData.ComputeNormals(positions, indices, normals);
	const vertexData = new VertexData();
	vertexData.positions = positions;
	vertexData.indices = indices;
	vertexData.normals = normals;
	vertexData.uvs = uvs;

	const mesh = new Mesh(`terrain:${chunk.key.x}:${chunk.key.z}`, scene);
	vertexData.applyToMesh(mesh, true);
	mesh.position.set(chunk.originX, 0, chunk.originZ);
	mesh.material = material;
	mesh.receiveShadows = true;
	return mesh;
}
