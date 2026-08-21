import type {
	WorldStateLayoutDescriptor,
	WorldStateMember,
	WorldStateSnapshot,
} from "~/engine/core/thread/worldStateBuffer";
import {
	Color3,
	DynamicTexture,
	Mesh,
	MeshBuilder,
	type Scene,
	StandardMaterial,
	type Vector3,
} from "~/platform/render/babylon/runtime";
import { ATTRIBUTE_CHANGE_VISUALIZERS, type AttributeChange, collectAttributeChanges } from "./attributeChangeVisuals";
import type { EntityRuntime } from "./entityTypes";

const ATTRIBUTE_CHANGE_DURATION_MS = 900;
const ATTRIBUTE_CHANGE_POP_DURATION_MS = 180;
const ATTRIBUTE_CHANGE_RISE_METERS = 0.8;
const ATTRIBUTE_CHANGE_STACK_GAP_METERS = 0.28;
const ATTRIBUTE_CHANGE_BASE_SCALE = 0.9;
const ATTRIBUTE_CHANGE_POP_SCALE = 1.2;
const ATTRIBUTE_CHANGE_SETTLE_DURATION_MS = 120;

type ActiveAttributeChange = AttributeChange & {
	id: number;
	mesh?: Mesh;
	texture?: DynamicTexture;
	material?: StandardMaterial;
};

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number): number {
	return 1 - (1 - value) ** 3;
}

/** 根据经过的逻辑时间计算数字的弹出缩放和淡出透明度。 */
export function resolveAttributeChangeAnimation(elapsedMs: number): { scale: number; visibility: number } {
	const elapsed = Math.max(0, elapsedMs);
	const popProgress = clamp01(elapsed / ATTRIBUTE_CHANGE_POP_DURATION_MS);
	const popScale =
		ATTRIBUTE_CHANGE_BASE_SCALE +
		(ATTRIBUTE_CHANGE_POP_SCALE - ATTRIBUTE_CHANGE_BASE_SCALE) * easeOutCubic(popProgress);
	if (elapsed < ATTRIBUTE_CHANGE_POP_DURATION_MS) return { scale: popScale, visibility: 1 };

	const settleProgress = clamp01((elapsed - ATTRIBUTE_CHANGE_POP_DURATION_MS) / ATTRIBUTE_CHANGE_SETTLE_DURATION_MS);
	const scale =
		ATTRIBUTE_CHANGE_POP_SCALE +
		(ATTRIBUTE_CHANGE_BASE_SCALE - ATTRIBUTE_CHANGE_POP_SCALE) * easeOutCubic(settleProgress);
	const fadeProgress = clamp01(
		(elapsed - ATTRIBUTE_CHANGE_POP_DURATION_MS) / (ATTRIBUTE_CHANGE_DURATION_MS - ATTRIBUTE_CHANGE_POP_DURATION_MS),
	);
	return { scale, visibility: 1 - fadeProgress };
}

/**
 * 渲染层本地属性变化表现。
 *
 * 它只观察完整 SAB 提交并保存当前视觉实例，不向 Worker 发送确认，也不消费领域事件。
 * 这样 HP 变化可以在提交被跳过时按净差值显示，同时保留后续扩展其他属性的统一入口。
 */
export class AttributeChangeVisualSystem {
	private readonly effects: ActiveAttributeChange[] = [];
	private nextEffectId = 1;

	constructor(private readonly scene: Scene) {}

	collect(previous: WorldStateSnapshot | null, latest: WorldStateSnapshot, layout: WorldStateLayoutDescriptor): void {
		const changes = collectAttributeChanges(previous, latest, layout, ATTRIBUTE_CHANGE_VISUALIZERS);
		for (const change of changes) {
			this.effects.push({ ...change, id: this.nextEffectId++ });
		}
	}

	/** 按当前成员位置和共享逻辑时间更新文字，过期实例在此处统一销毁。 */
	sync(
		entities: ReadonlyMap<string, EntityRuntime>,
		entitySlots: ReadonlyMap<string, number>,
		members: readonly WorldStateMember[],
		renderLogicalTimeMs: number,
	): void {
		const entityIdsBySlot = new Map<number, string>();
		for (const [entityId, slot] of entitySlots) entityIdsBySlot.set(slot, entityId);
		const stackIndices = new Map<number, number>();
		const remaining: ActiveAttributeChange[] = [];

		for (const effect of this.effects) {
			const member = members[effect.memberSlot];
			const elapsedMs = renderLogicalTimeMs - effect.occurredAtLogicalTimeMs;
			if (!member?.active || member.generation !== effect.generation || elapsedMs >= ATTRIBUTE_CHANGE_DURATION_MS) {
				this.disposeEffect(effect);
				continue;
			}

			const stackIndex = stackIndices.get(effect.memberSlot) ?? 0;
			stackIndices.set(effect.memberSlot, stackIndex + 1);
			const entityId = entityIdsBySlot.get(effect.memberSlot);
			const entity = entityId ? entities.get(entityId) : undefined;
			if (entity) {
				if (!effect.mesh) this.createEffectMesh(effect);
				this.updateEffectMesh(effect, entity, clamp01(elapsedMs / ATTRIBUTE_CHANGE_DURATION_MS), stackIndex);
			}
			remaining.push(effect);
		}

		this.effects.splice(0, this.effects.length, ...remaining);
	}

	clear(): void {
		for (const effect of this.effects) this.disposeEffect(effect);
		this.effects.length = 0;
	}

	private createEffectMesh(effect: ActiveAttributeChange): void {
		const mesh = MeshBuilder.CreatePlane(`attribute-change:${effect.id}`, { width: 1.9, height: 0.48 }, this.scene);
		mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
		mesh.isPickable = false;

		const textureWidth = 384;
		const textureHeight = 96;
		const texture = new DynamicTexture(
			`attribute-change-texture:${effect.id}`,
			{ width: textureWidth, height: textureHeight },
			this.scene,
			false,
		);
		texture.hasAlpha = true;
		const context = texture.getContext();
		context.clearRect(0, 0, textureWidth, textureHeight);
		let fontSize = 48;
		context.font = `bold ${fontSize}px system-ui, sans-serif`;
		while (fontSize > 26 && context.measureText(effect.text).width > textureWidth - 24) {
			fontSize -= 2;
			context.font = `bold ${fontSize}px system-ui, sans-serif`;
		}
		context.lineJoin = "round";
		context.lineWidth = 6;
		context.strokeStyle = "rgba(0, 0, 0, 0.82)";
		context.fillStyle = effect.color;
		const metrics = context.measureText(effect.text);
		const measuredHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
		const textX = (textureWidth - metrics.width) / 2;
		const textY =
			measuredHeight > 0
				? (textureHeight - measuredHeight) / 2 + metrics.actualBoundingBoxAscent
				: textureHeight / 2 + fontSize * 0.35;
		context.strokeText(effect.text, textX, textY);
		context.fillText(effect.text, textX, textY);
		texture.update();

		const material = new StandardMaterial(`attribute-change-material:${effect.id}`, this.scene);
		material.diffuseTexture = texture;
		material.emissiveTexture = texture;
		material.emissiveColor = Color3.White();
		material.useAlphaFromDiffuseTexture = true;
		material.disableLighting = true;
		material.backFaceCulling = false;
		mesh.material = material;

		effect.mesh = mesh;
		effect.texture = texture;
		effect.material = material;
	}

	private updateEffectMesh(
		effect: ActiveAttributeChange,
		entity: EntityRuntime,
		progress: number,
		stackIndex: number,
	): void {
		const mesh = effect.mesh;
		if (!mesh) return;
		const anchor = this.resolveAnchor(entity);
		mesh.position.copyFrom(anchor);
		mesh.position.y += 0.25 + stackIndex * ATTRIBUTE_CHANGE_STACK_GAP_METERS + progress * ATTRIBUTE_CHANGE_RISE_METERS;
		const animation = resolveAttributeChangeAnimation(progress * ATTRIBUTE_CHANGE_DURATION_MS);
		mesh.scaling.set(animation.scale, animation.scale, animation.scale);
		mesh.visibility = animation.visibility;
	}

	private resolveAnchor(entity: EntityRuntime): Vector3 {
		return entity.label?.getAbsolutePosition() ?? entity.mesh.getAbsolutePosition();
	}

	private disposeEffect(effect: ActiveAttributeChange): void {
		effect.mesh?.dispose(false, true);
		effect.texture = undefined;
		effect.material = undefined;
		effect.mesh = undefined;
	}
}
