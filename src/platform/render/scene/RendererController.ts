/**
 * 渲染控制器（内容编排关注点的组装入口）。
 *
 * 架构说明：
 * - 物理计算在 Worker 内 GameEngine 中进行，这里只负责渲染同步。
 * - 通过 MessageChannel 接收渲染命令（见 RendererCommunication），不直接使用 window.dispatchEvent。
 * - 相机控制通过自定义事件转发给 ThirdPersonCameraController。
 * - 实体状态通过命令模式更新，确保时序正确性。
 *
 * 本文件只做子系统组装；具体实现拆分在 content/ 下：
 * - entityTypes.ts：共享实体与动画系统类型
 * - CharacterAnimationController.ts：角色动画控制
 * - EntityFactory.ts：实体创建 + GLB 模型缓存
 * - CommandHandler.ts：渲染命令 → Babylon 操作 + 快照应用
 * - RenderSyncSystem.ts：physics → mesh 同步
 */

import type { RendererCmd, RenderSnapshot } from "~/engine/core/thread/RendererProtocol";
import type { MemberSlotIndex, WorldStateReader } from "~/engine/core/thread/worldStateBuffer";
import { createLogger } from "~/lib/logger";
import type { Scene, TransformNode } from "~/platform/render/babylon/runtime";
import { CommandHandler } from "./content/CommandHandler";
import { EntityFactory } from "./content/EntityFactory";
import type { EntityRuntime } from "./content/entityTypes";
import { RenderSyncSystem } from "./content/RenderSyncSystem";
import type { RendererController, WorldResourcePose } from "./contracts/worldContent";
import type { WorldResource } from "./contracts/worldResource";

const logger = createLogger("RenderController");
logger.setLevel(0);

export type RendererControllerOptions = {
	contentRoot?: TransformNode;
	/** Character 内容的短会话共享模型模板缓存，但每个会话仍拥有独立 controller 状态。 */
	entityFactory?: EntityFactory;
	/** SAB 世界状态读取器；提供时 RenderSyncSystem 每帧从 SAB 读取权威位置/yaw + 指数平滑。 */
	worldStateReader?: WorldStateReader | null;
	/** memberId → SAB 槽位下标映射；与 worldStateReader 同生命周期。 */
	worldStateSlotIndex?: MemberSlotIndex | null;
};

export function createRendererController(scene: Scene, options: RendererControllerOptions = {}): RendererController {
	const entities = new Map<string, EntityRuntime>();
	const factory = options.entityFactory ?? new EntityFactory(scene, options.contentRoot);
	const renderSyncSystem = new RenderSyncSystem(
		options.worldStateReader,
		options.worldStateSlotIndex,
	);
	const commandHandler = new CommandHandler(entities, factory, scene, {
		onPoseDiscontinuity: (entityId) => renderSyncSystem.resetEntity(entityId),
		onEntityRemoved: (entityId) => renderSyncSystem.removeEntity(entityId),
	});

	function send(cmd: RendererCmd | RendererCmd[]): void {
		if (Array.isArray(cmd)) {
			cmd.forEach((c) => {
				commandHandler.handle(c).catch((error) => {
					logger.error("RendererController: 处理命令失败", c, error);
				});
			});
		} else {
			commandHandler.handle(cmd).catch((error) => {
				logger.error("RendererController: 处理命令失败", cmd, error);
			});
		}
	}

	/**
	 * 渲染帧更新 - 仅同步实体状态到渲染网格
	 * 不进行物理计算，物理计算应该在GameEngine中完成
	 */
	function tick(dtSec: number): void {
		renderSyncSystem.syncEntities(entities, dtSec);
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

	function applyRenderSnapshot(renderSnapshot: RenderSnapshot): Promise<void> {
		return commandHandler.applyRenderSnapshot(renderSnapshot);
	}

	function applyWorldResources(resources: WorldResource[], poses: WorldResourcePose[]): Promise<void> {
		return commandHandler.applyWorldResources(resources, poses);
	}

	return { send, tick, dispose, getEntityPose, applyWorldResources, applyRenderSnapshot };
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
