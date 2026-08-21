import type { WorldStateMember } from "~/engine/core/thread/worldStateBuffer";
import { Color3, Mesh, type Scene, StandardMaterial, VertexData } from "~/platform/render/babylon/runtime";
import type { EntityRuntime } from "./entityTypes";
import { resolveStateProgressVisual, type StateProgressVisualDefinition } from "./stateProgressVisuals";

const SECTOR_SEGMENTS = 64;
const SECTOR_RADIUS_METERS = 1.35;
const SECTOR_GROUND_OFFSET_METERS = 0.06;

type ActiveStateProgressVisual = {
	generation: number;
	stateId: number;
	stateInstance: number;
	mesh: Mesh;
};

function createSectorPositions(progress: number): number[] {
	const positions = [0, 0, 0];
	const completedAngle = Math.PI * 2 * progress;
	for (let index = 0; index <= SECTOR_SEGMENTS; index++) {
		const angle = -Math.PI / 2 + Math.min((index / SECTOR_SEGMENTS) * Math.PI * 2, completedAngle);
		positions.push(Math.cos(angle) * SECTOR_RADIUS_METERS, 0, Math.sin(angle) * SECTOR_RADIUS_METERS);
	}
	return positions;
}

function createSectorIndices(): number[] {
	const indices: number[] = [];
	for (let index = 0; index < SECTOR_SEGMENTS; index++) indices.push(0, index + 1, index + 2);
	return indices;
}

/**
 * 渲染层本地技能阶段进度表现。
 *
 * 系统只读取 SAB 状态实例、技能生命周期和逻辑时间；固定拓扑的扇形顶点在渲染帧内更新，
 * 因而暂停、倍速和提交跳帧都与其他实时世界表现使用同一逻辑时间。
 */
export class StateProgressVisualSystem {
	private readonly effects = new Map<number, ActiveStateProgressVisual>();
	private readonly materials = new Map<string, StandardMaterial>();

	constructor(private readonly scene: Scene) {}

	/** 同步当前可见状态；状态实例、成员代次或槽位归属变化时立即替换旧 Mesh。 */
	sync(
		entities: ReadonlyMap<string, EntityRuntime>,
		entitySlots: ReadonlyMap<string, number>,
		members: readonly WorldStateMember[],
		renderLogicalTimeMs: number,
	): void {
		const visitedSlots = new Set<number>();
		for (const [entityId, slot] of entitySlots) {
			visitedSlots.add(slot);
			const member = members[slot];
			const entity = entities.get(entityId);
			const resolved = member ? resolveStateProgressVisual(member, renderLogicalTimeMs) : null;
			if (!member || !entity || !resolved) {
				this.removeEffect(slot);
				continue;
			}

			let effect = this.effects.get(slot);
			if (
				!effect ||
				effect.generation !== member.generation ||
				effect.stateId !== member.state.id ||
				effect.stateInstance !== member.state.instance
			) {
				this.removeEffect(slot);
				effect = this.createEffect(slot, member, resolved.definition);
			}

			effect.mesh.updateVerticesData("position", createSectorPositions(resolved.progress));
			effect.mesh.position.copyFrom(entity.mesh.getAbsolutePosition());
			effect.mesh.position.y += SECTOR_GROUND_OFFSET_METERS;
		}

		for (const slot of this.effects.keys()) {
			if (!visitedSlots.has(slot)) this.removeEffect(slot);
		}
	}

	clear(): void {
		for (const effect of this.effects.values()) effect.mesh.dispose();
		this.effects.clear();
		for (const material of this.materials.values()) material.dispose();
		this.materials.clear();
	}

	private createEffect(
		slot: number,
		member: WorldStateMember,
		definition: StateProgressVisualDefinition,
	): ActiveStateProgressVisual {
		const mesh = new Mesh(`state-progress:${slot}:${member.generation}:${member.state.instance}`, this.scene);
		mesh.isPickable = false;
		const vertexData = new VertexData();
		vertexData.positions = createSectorPositions(0);
		vertexData.indices = createSectorIndices();
		vertexData.normals = Array.from({ length: SECTOR_SEGMENTS + 2 }, () => [0, 1, 0]).flat();
		vertexData.applyToMesh(mesh, true);
		mesh.material = this.getMaterial(definition);

		const effect = {
			generation: member.generation,
			stateId: member.state.id,
			stateInstance: member.state.instance,
			mesh,
		};
		this.effects.set(slot, effect);
		return effect;
	}

	private getMaterial(definition: StateProgressVisualDefinition): StandardMaterial {
		const existing = this.materials.get(definition.state);
		if (existing) return existing;
		const material = new StandardMaterial(`state-progress-material:${definition.state}`, this.scene);
		const color = new Color3(...definition.color);
		material.alpha = 0.42;
		material.diffuseColor = color;
		material.emissiveColor = color;
		material.disableLighting = true;
		material.backFaceCulling = false;
		this.materials.set(definition.state, material);
		return material;
	}

	private removeEffect(slot: number): void {
		const effect = this.effects.get(slot);
		if (!effect) return;
		effect.mesh.dispose();
		this.effects.delete(slot);
	}
}
