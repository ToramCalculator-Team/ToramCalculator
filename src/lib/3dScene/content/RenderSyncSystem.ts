/**
 * 渲染同步系统（内容编排关注点）。
 *
 * 仅负责将实体 physics 状态同步到渲染网格，不进行任何物理计算——物理在 Worker 内 GameEngine 完成。
 * 从 RendererController 拆出。
 */

import { Mesh, TransformNode, Vector3 } from "~/lib/babylon/runtime";
import type { EntityRuntime } from "./entityTypes";

export class RenderSyncSystem {
	/**
	 * 同步所有实体的渲染状态
	 * 仅将实体的physics状态同步到网格，不进行任何计算
	 */
	syncEntities(entities: Map<string, EntityRuntime>): void {
		entities.forEach((entity) => {
			this.syncEntityRender(entity);
		});
	}

	/**
	 * 同步单个实体的渲染状态
	 * 将实体的物理位置、朝向同步到Babylon.js网格
	 */
	private syncEntityRender(entity: EntityRuntime): void {
		const physics = entity.physics;

		// 同步网格位置（直接使用physics.pos，不进行任何计算）
		entity.mesh.position.copyFrom(physics.pos);

		// 同步网格旋转
		if (entity.mesh instanceof Mesh || entity.mesh instanceof TransformNode) {
			entity.mesh.rotation.y = physics.yaw;
		}

		// 更新标签位置（在实体上方）
		if (entity.label) {
			entity.label.position = physics.pos.add(new Vector3(0, 0.6, 0));
		}
	}
}
