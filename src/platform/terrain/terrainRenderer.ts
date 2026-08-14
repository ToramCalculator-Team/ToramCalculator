import { createLogger } from "~/lib/logger";
import type { TerrainChunkData, TerrainChunkKey, TerrainDefinition } from "~/lib/terrain";
import { Color3, Mesh, type Scene, ShaderMaterial, Vector3, VertexData } from "~/platform/render/babylon/runtime";
import { FOG_OF_WAR_INNER_RADIUS, FOG_OF_WAR_OUTER_RADIUS } from "~/platform/render/scene/materials/fogOfWar";
import type { TerrainRenderConfig } from "./worldConfig";

const log = createLogger("TerrainRenderer");

export interface TerrainRenderer {
	mount(scene: Scene): void;
	setColors(mainColor: Color3, lineColor: Color3, fogColor: Color3): void;
	update(cameraPosition: Vector3, revealCenter: Vector3): void;
	dispose(): void;
}

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
	let material: ShaderMaterial | null = null;
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
				meshes.set(id, createChunkMesh(scene, material, chunk));
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
		setColors(mainColor, lineColor, fogColor) {
			if (!material || disposed) return;
			material.setColor3("mainColor", mainColor);
			material.setColor3("lineColor", lineColor);
			material.setColor3("fogOfWarColor", fogColor);
		},
		update(cameraPosition, revealCenter) {
			if (disposed || !scene) return;
			material?.setVector3("fogOfWarCenter", revealCenter);
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
			material?.dispose();
			material = null;
			scene = null;
			desired.clear();
		},
	};
}

const TERRAIN_VERTEX_SHADER = `
precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 worldViewProjection;
varying vec3 vWorldPosition;

void main(void) {
	vec4 worldPosition = world * vec4(position, 1.0);
	vWorldPosition = worldPosition.xyz;
	gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

const TERRAIN_FRAGMENT_SHADER = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec3 mainColor;
uniform vec3 lineColor;
uniform vec3 fogOfWarColor;
uniform vec3 fogOfWarCenter;
uniform float gridRatio;
uniform float majorUnitFrequency;
uniform float minorUnitVisibility;
uniform float fogOfWarInnerRadius;
uniform float fogOfWarOuterRadius;
varying vec3 vWorldPosition;

float gridLine(float coordinate, float ratio) {
	float gridCoordinate = coordinate / ratio;
	float distanceToLine = abs(fract(gridCoordinate - 0.5) - 0.5);
	float derivativeWidth = max(fwidth(gridCoordinate), 0.0001);
	return 1.0 - smoothstep(derivativeWidth * 0.5, derivativeWidth * 1.5, distanceToLine);
}

void main(void) {
	float minorGrid = max(gridLine(vWorldPosition.x, gridRatio), gridLine(vWorldPosition.z, gridRatio));
	float majorRatio = gridRatio * majorUnitFrequency;
	float majorGrid = max(gridLine(vWorldPosition.x, majorRatio), gridLine(vWorldPosition.z, majorRatio));
	float grid = clamp(max(majorGrid, minorGrid * minorUnitVisibility), 0.0, 1.0);
	vec3 terrainColor = mix(mainColor, lineColor, grid);

	float distanceFromCenter = distance(vWorldPosition.xz, fogOfWarCenter.xz);
	float visibility = 1.0 - smoothstep(fogOfWarInnerRadius, fogOfWarOuterRadius, distanceFromCenter);
	gl_FragColor = vec4(mix(fogOfWarColor, terrainColor, visibility), 1.0);
}`;

/** 创建同时负责世界网格和径向战争迷雾的地形材质。 */
function createTerrainMaterial(scene: Scene): ShaderMaterial {
	const material = new ShaderMaterial(
		"terrain:grid-material",
		scene,
		{ vertexSource: TERRAIN_VERTEX_SHADER, fragmentSource: TERRAIN_FRAGMENT_SHADER },
		{
			attributes: ["position"],
			uniforms: [
				"world",
				"worldViewProjection",
				"mainColor",
				"lineColor",
				"fogOfWarColor",
				"fogOfWarCenter",
				"gridRatio",
				"majorUnitFrequency",
				"minorUnitVisibility",
				"fogOfWarInnerRadius",
				"fogOfWarOuterRadius",
			],
		},
	);
	material.setColor3("mainColor", new Color3(0.23, 0.36, 0.19));
	material.setColor3("lineColor", new Color3(0.08, 0.12, 0.08));
	material.setColor3("fogOfWarColor", Color3.Black());
	material.setVector3("fogOfWarCenter", Vector3.Zero());
	material.setFloat("gridRatio", 1);
	material.setFloat("majorUnitFrequency", 8);
	material.setFloat("minorUnitVisibility", 0.35);
	material.setFloat("fogOfWarInnerRadius", FOG_OF_WAR_INNER_RADIUS);
	material.setFloat("fogOfWarOuterRadius", FOG_OF_WAR_OUTER_RADIUS);
	return material;
}

function createChunkMesh(scene: Scene, material: ShaderMaterial, chunk: TerrainChunkData): Mesh {
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
