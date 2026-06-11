/**
 * 场景意图桥组件。意图层与场景的唯一集成点。
 *
 * 见 docs/decisions/0012-intent-first-visual-control.md
 *
 * onMount 用 useSceneRuntime() 构造真实场景 deps，接线 createSceneIntentProjection；onCleanup dispose。
 * 必须挂在 SceneRuntimeProvider 内、AppActorProvider 内。
 */

import { onCleanup, onMount } from "solid-js";
import { type CameraPose, useSceneRuntime } from "~/lib/engine/render/SceneRuntime";
import { useVisualIntent } from "../AppActorContext";
import type { EquipSlot } from "../intent/types";
import { createSceneIntentProjection, type SceneIntentProjectionDeps } from "./sceneIntentProjection";

/**
 * 装备槽相机锚位（最小真实相机）：围绕角色站位原点（0,0,0）的近景姿态。
 * 设计阶段尚无角色模型，对准的是角色应站立的原点空间——数值首版凭估，跑起来再调（冲突 #4）。
 * alpha 水平环绕角、beta 俯仰角、radius 距离、target 对准点。
 */
const SLOT_CAMERA_POSES: Record<EquipSlot, CameraPose> = {
	weapon: { alpha: Math.PI / 2.6, beta: 1.35, radius: 2.0, target: { x: 0.35, y: 1.0, z: 0 } },
	subWeapon: { alpha: Math.PI / 1.55, beta: 1.35, radius: 2.0, target: { x: -0.35, y: 1.0, z: 0 } },
	armor: { alpha: Math.PI / 2, beta: 1.5, radius: 2.4, target: { x: 0, y: 1.0, z: 0 } },
	option: { alpha: Math.PI / 2, beta: 1.7, radius: 2.2, target: { x: 0, y: 0.6, z: 0 } },
	special: { alpha: Math.PI / 2, beta: 1.2, radius: 2.6, target: { x: 0, y: 1.4, z: 0 } },
};

export function SceneIntentBridge() {
	const intentActor = useVisualIntent();
	const sceneRuntime = useSceneRuntime();

	onMount(() => {
		const deps: SceneIntentProjectionDeps = {
			focusTarget: (target, _op, onSettled) => {
				if (target.kind === "equipmentSlot") {
					const pose = SLOT_CAMERA_POSES[target.slot];
					return sceneRuntime.focusCamera(pose, onSettled);
				}
				// 其他 kind 暂无场景投影：立即回执（建议性回执兜底）。
				console.debug("[SceneIntentBridge] focusTarget 无场景投影，立即回执", target.kind);
				queueMicrotask(onSettled);
				return () => {};
			},
			releaseFocus: (onSettled) => sceneRuntime.resetCamera(onSettled),
		};

		const dispose = createSceneIntentProjection(intentActor, deps);
		onCleanup(dispose);
	});

	return null;
}
