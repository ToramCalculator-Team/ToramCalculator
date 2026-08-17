import type { Scene } from "~/platform/render/babylon/runtime";
import {
	Color3,
	MeshBuilder,
	SolidParticleSystem,
	StandardMaterial,
	type Vector3,
} from "~/platform/render/babylon/runtime";

const CELL_SIZE = 5;
const CELL_RADIUS = 4;
const CELL_DIAMETER = CELL_RADIUS * 2 + 1;
const MOTE_COUNT = CELL_DIAMETER * CELL_DIAMETER;
const FIELD_HEIGHT = 2.8;
const UPDATE_INTERVAL_SECONDS = 1 / 120;

type GroundHeightSampler = (x: number, z: number) => number;

export interface AmbientMotes {
	setTheme(color: Color3, darkMode: boolean): void;
	update(deltaSeconds: number, center: Vector3, getGroundHeight: GroundHeightSampler): void;
	dispose(): void;
}

/** 从整数世界单元计算稳定随机值，窗口离开后再返回也会恢复相同粒子。 */
function cellRandom(cellX: number, cellZ: number, salt: number): number {
	let value = Math.imul(cellX, 0x1f123bb5) ^ Math.imul(cellZ, 0x5f356495) ^ salt;
	value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
	value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
	return ((value ^ (value >>> 15)) >>> 0) / 0x1_0000_0000;
}

/**
 * 创建固定在世界单元中的环境微粒。
 * 观察中心只选择附近单元窗口，粒子世界位置由单元坐标确定；全部粒子仍合并为一个 SPS 网格，顶点上传上限为 120 Hz。
 */
export function createAmbientMotes(scene: Scene): AmbientMotes {
	const system = new SolidParticleSystem("world-ambient-motes", scene, {
		updatable: true,
		isPickable: false,
		computeBoundingBox: false,
	});
	const source = MeshBuilder.CreateBox("world-ambient-mote-source", { size: 0.035 }, scene);
	system.addShape(source, MOTE_COUNT);
	source.dispose();

	const mesh = system.buildMesh();
	mesh.isPickable = false;
	mesh.receiveShadows = false;
	system.isAlwaysVisible = true;
	system.computeParticleRotation = false;
	system.computeParticleColor = false;
	system.computeParticleTexture = false;
	system.computeBoundingBox = false;

	const material = new StandardMaterial("world-ambient-motes-material", scene);
	material.disableLighting = true;
	material.diffuseColor = Color3.White();
	material.emissiveColor = Color3.White();
	material.specularColor = Color3.Black();
	material.alpha = 0.48;
	mesh.material = material;

	const worldX = new Float32Array(MOTE_COUNT);
	const worldZ = new Float32Array(MOTE_COUNT);
	const groundY = new Float32Array(MOTE_COUNT);
	const riseSpeed = new Float32Array(MOTE_COUNT);
	const swayPhase = new Float32Array(MOTE_COUNT);
	const swaySpeed = new Float32Array(MOTE_COUNT);
	const heightPhase = new Float32Array(MOTE_COUNT);
	const assignWorldCells = (centerCellX: number, centerCellZ: number, getGroundHeight: GroundHeightSampler): void => {
		for (let localZ = -CELL_RADIUS; localZ <= CELL_RADIUS; localZ += 1) {
			for (let localX = -CELL_RADIUS; localX <= CELL_RADIUS; localX += 1) {
				const index = (localZ + CELL_RADIUS) * CELL_DIAMETER + localX + CELL_RADIUS;
				const particle = system.particles[index];
				if (!particle) continue;
				const cellX = centerCellX + localX;
				const cellZ = centerCellZ + localZ;
				worldX[index] = (cellX + 0.12 + cellRandom(cellX, cellZ, 0x1a2b3c4d) * 0.76) * CELL_SIZE;
				worldZ[index] = (cellZ + 0.12 + cellRandom(cellX, cellZ, 0x5e6f7788) * 0.76) * CELL_SIZE;
				groundY[index] = getGroundHeight(worldX[index], worldZ[index]) + 0.12;
				riseSpeed[index] = 0.08 + cellRandom(cellX, cellZ, 0x13579bdf) * 0.11;
				swayPhase[index] = cellRandom(cellX, cellZ, 0x2468ace0) * Math.PI * 2;
				swaySpeed[index] = 0.35 + cellRandom(cellX, cellZ, 0x10293847) * 0.45;
				heightPhase[index] = cellRandom(cellX, cellZ, 0x56473829) * FIELD_HEIGHT;
				particle.scale.setAll(0.65 + cellRandom(cellX, cellZ, 0x55aa55aa) * 0.9);
			}
		}
	};

	let elapsedSeconds = 0;
	let updateAccumulator = 0;
	let activeCellX: number | undefined;
	let activeCellZ: number | undefined;
	let disposed = false;
	return {
		setTheme(color, darkMode) {
			material.diffuseColor.copyFrom(color);
			material.emissiveColor.copyFrom(color);
			material.alpha = darkMode ? 0.5 : 0.34;
		},
		update(deltaSeconds, center, getGroundHeight) {
			if (disposed) return;
			const boundedDelta = Math.min(Math.max(deltaSeconds, 0), 0.1);
			elapsedSeconds += boundedDelta;
			updateAccumulator += boundedDelta;
			const centerCellX = Math.floor(center.x / CELL_SIZE);
			const centerCellZ = Math.floor(center.z / CELL_SIZE);
			const cellChanged = centerCellX !== activeCellX || centerCellZ !== activeCellZ;
			if (cellChanged) {
				activeCellX = centerCellX;
				activeCellZ = centerCellZ;
				assignWorldCells(centerCellX, centerCellZ, getGroundHeight);
			}
			if (!cellChanged && updateAccumulator < UPDATE_INTERVAL_SECONDS) return;
			updateAccumulator %= UPDATE_INTERVAL_SECONDS;

			for (let index = 0; index < MOTE_COUNT; index += 1) {
				const particle = system.particles[index];
				if (!particle) continue;
				const sway = Math.sin(elapsedSeconds * swaySpeed[index] + swayPhase[index]) * 0.16;
				particle.position.x = worldX[index] + sway;
				particle.position.y =
					groundY[index] + ((heightPhase[index] + elapsedSeconds * riseSpeed[index]) % FIELD_HEIGHT);
				particle.position.z = worldZ[index] + sway * 0.55;
			}
			system.setParticles();
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			system.dispose();
			material.dispose();
		},
	};
}
