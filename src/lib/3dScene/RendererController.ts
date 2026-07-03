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
 * - entityTypes.ts：共享类型 + BuiltinAnimationType
 * - CharacterAnimationController.ts：角色动画控制
 * - EntityFactory.ts：实体创建 + GLB 模型缓存
 * - CommandHandler.ts：渲染命令 → Babylon 操作 + 快照应用
 * - RenderSyncSystem.ts：physics → mesh 同步
 */

import type { Scene } from "~/lib/babylon/runtime";
import { createLogger } from "~/lib/Logger";
import type { RendererCmd, RendererController, RenderSnapshot } from "../engine/core/thread/RendererProtocol";
import { CommandHandler } from "./content/CommandHandler";
import { EntityFactory } from "./content/EntityFactory";
import type { EntityRuntime } from "./content/entityTypes";
import { RenderSyncSystem } from "./content/RenderSyncSystem";

const logger = createLogger("RenderController");
logger.setLevel(0);

export function createRendererController(scene: Scene): RendererController {
	const entities = new Map<string, EntityRuntime>();
	const factory = new EntityFactory(scene);
	const commandHandler = new CommandHandler(entities, factory, scene);
	const renderSyncSystem = new RenderSyncSystem();

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
		// 注意：这里不再进行物理计算，只同步渲染状态
		renderSyncSystem.syncEntities(entities);
	}

	/** 销毁所有实体并清理资源 */
	function dispose(): void {
		commandHandler.disposeAreaVisuals();
		// 为每个实体发送销毁命令，复用现有逻辑
		entities.forEach((entity, id) => {
			commandHandler.handle({
				type: "destroy",
				entityId: id,
				seq: Number.MAX_SAFE_INTEGER, // 使用最大序列号确保执行
				ts: 0,
			});
		});
		entities.clear();
	}

	function getEntityPose(id: string) {
		const entity = entities.get(id);
		if (!entity) return undefined;
		return {
			pos: {
				x: entity.physics.pos.x,
				y: entity.physics.pos.y,
				z: entity.physics.pos.z,
			},
			yaw: entity.physics.yaw,
		};
	}

	function applyRenderSnapshot(renderSnapshot: RenderSnapshot): Promise<void> {
		return commandHandler.applyRenderSnapshot(renderSnapshot);
	}

	return { send, tick, dispose, getEntityPose, applyRenderSnapshot };
}

// ==================== 导出接口 ====================
// 保持对外导出面不变：消费者仍可从本入口拿到工厂 / 动画控制器 / 类型 / 枚举。

export { CharacterAnimationController } from "./content/CharacterAnimationController";
export { EntityFactory } from "./content/EntityFactory";
export { BuiltinAnimationType } from "./content/entityTypes";
export type {
	AnimationPlayRequest,
	BaseEntityRuntime,
	CharacterEntityRuntime,
	CustomAnimationData,
	EntityRuntime,
	SimpleEntityRuntime,
} from "./content/entityTypes";
