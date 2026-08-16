/**
 * 渲染控制器（内容编排关注点的组装入口）。
 *
 * 架构说明：
 * - 物理计算在 Worker 内 GameEngine 中进行，这里只负责渲染同步。
 * - 静态资源由 Session 初始化，连续实体和区域状态只读取统一 SAB。
 * - 相机目标由 Session 配置，运行状态不通过渲染消息补充。
 *
 * 本文件只做子系统组装；具体实现拆分在 content/ 下：
 * - entityTypes.ts：共享实体与动画系统类型
 * - CharacterAnimationController.ts：角色动画控制
 * - EntityFactory.ts：实体创建 + GLB 模型缓存
 * - CommandHandler.ts：静态资源注册与 Babylon 实体生命周期
 * - RenderSyncSystem.ts：physics → mesh 同步
 */

import type {
	WorldStateLayoutDescriptor,
	WorldStateMember,
	WorldStateReader,
} from "~/engine/core/thread/worldStateBuffer";
import type { Scene, TransformNode } from "~/platform/render/babylon/runtime";
import { CommandHandler } from "./content/CommandHandler";
import { EntityFactory } from "./content/EntityFactory";
import type { EntityRuntime } from "./content/entityTypes";
import { RenderSyncSystem } from "./content/RenderSyncSystem";
import type { RendererController, WorldResourcePose } from "./contracts/worldContent";
import type { WorldResource } from "./contracts/worldResource";

export type RendererControllerOptions = {
	contentRoot?: TransformNode;
	/** Character 内容的短会话共享模型模板缓存，但每个会话仍拥有独立 controller 状态。 */
	entityFactory?: EntityFactory;
	/** SAB 世界状态读取器；提供时 RenderSyncSystem 每帧从 SAB 读取权威位置/yaw + 指数平滑。 */
	worldStateReader?: WorldStateReader | null;
	worldStateLayout?: WorldStateLayoutDescriptor | null;
};

export function createRendererController(scene: Scene, options: RendererControllerOptions = {}): RendererController {
	const worldStateReader = options.worldStateReader ?? null;
	const worldStateLayout = options.worldStateLayout ?? null;
	if ((worldStateReader === null) !== (worldStateLayout === null)) {
		throw new Error("实时渲染器必须同时提供世界状态 reader 和布局");
	}
	const entities = new Map<string, EntityRuntime>();
	const entitySlots = new Map<string, number>();
	const factory = options.entityFactory ?? new EntityFactory(scene, options.contentRoot);
	const renderSyncSystem = new RenderSyncSystem();
	const commandHandler = new CommandHandler(entities, factory, scene, {
		onPoseDiscontinuity: (entityId) => renderSyncSystem.resetEntity(entityId),
		onEntityRemoved: (entityId) => renderSyncSystem.removeEntity(entityId),
	});
	const entityIdForSlot = (layoutId: string, slot: number, member: WorldStateMember) =>
		layoutId.startsWith("__empty_") ? `world-slot:${slot}:${member.generation}:${member.entityIdHash}` : layoutId;

	/**
	 * 渲染帧更新 - 仅同步实体状态到渲染网格
	 * 不进行物理计算，物理计算应该在GameEngine中完成
	 */
	function tick(dtSec: number): void {
		const snapshot = worldStateReader?.readLatest() ?? null;
		const layout = worldStateLayout;
		if (snapshot && layout) {
			commandHandler.syncAreas(snapshot.areas);
			const previousEntityIds = new Set(entitySlots.keys());
			const nextEntitySlots = new Map<string, number>();
			snapshot.members.forEach((member, slot) => {
				const memberLayout = layout.memberDirectory[slot];
				if (!memberLayout) return;
				if (!memberLayout.id.startsWith("__empty_")) previousEntityIds.add(memberLayout.id);
				if (!member.active) return;
				const entityId = entityIdForSlot(memberLayout.id, slot, member);
				nextEntitySlots.set(entityId, slot);
				if (entities.has(entityId)) return;
				void commandHandler.ensureEntityFromVisualProfile(
					entityId,
					member.visualProfileId,
					member.position,
					snapshot.tickIndex,
				);
			});
			for (const entityId of previousEntityIds) {
				if (!nextEntitySlots.has(entityId)) commandHandler.removeEntity(entityId);
			}
			entitySlots.clear();
			for (const [entityId, slot] of nextEntitySlots) entitySlots.set(entityId, slot);
			if (worldStateReader) commandHandler.syncMemberStates(snapshot, layout, entitySlots);
		}
		renderSyncSystem.syncEntities(entities, entitySlots, snapshot, dtSec);
	}

	/** 销毁所有实体并清理资源 */
	function dispose(): void {
		commandHandler.clearWorldResources();
		commandHandler.disposeAreaVisuals();
	}

	function getEntityPose(id: string) {
		const entity = entities.get(id);
		if (!entity) return undefined;
		return {
			pos: {
				x: entity.mesh.position.x,
				y: entity.mesh.position.y,
				z: entity.mesh.position.z,
			},
			yaw: entity.physics.yaw,
		};
	}

	function applyWorldResources(resources: WorldResource[], poses: WorldResourcePose[]): Promise<void> {
		return commandHandler.applyWorldResources(resources, poses, worldStateReader ? "realtime" : "static");
	}

	return { tick, dispose, getEntityPose, applyWorldResources };
}

// ==================== 导出接口 ====================
// 消费者可从本入口拿到工厂、动画控制器与共享类型。

export { CharacterAnimationController } from "./content/CharacterAnimationController";
export { EntityFactory } from "./content/EntityFactory";
export type {
	BaseEntityRuntime,
	CharacterEntityRuntime,
	CustomAnimationData,
	EntityRuntime,
	SimpleEntityRuntime,
} from "./content/entityTypes";
