/**
 * 角色内容编排 deps（内容编排关注点）。
 *
 * 从 SceneRuntimeCore 抽出的「角色静态内容」建立/拆除逻辑，供 sceneStateMachine 的
 * setupCharacterContent/teardownCharacterContent 注入使用。
 *
 * 为什么只抽角色内容、不抽 realtime：
 * - 角色内容只依赖 scene + characterRoot，其工厂/实体/序号是本模块私有，无人从外部读取 → 可干净独立。
 * - realtime 的 rendererController/thirdPersonController 被宿主 render loop（tick/update）与 API 共享读取，
 *   属宿主与内容的共享状态，留在 Core 组装，不强行外移成「refs 袋」。
 *
 * 快速来回切换：setup 为异步（含模型 HTTP 加载），用自增 seq 做 stale-discard；teardown 自增 seq
 * 使在途结果失配丢弃——与 acquireRealtimeSession 的 sessionId 守卫同构。
 */

import type { Scene, TransformNode } from "~/lib/babylon/runtime";
import { Vector3 } from "~/lib/babylon/runtime";
import { BuiltinAnimationType, type CharacterEntityRuntime, EntityFactory } from "../RendererController";

/**
 * 完整清理一个角色实体：动画组 / 网格 / 标签 / 纹理。仿 RendererController.disposeEntity——
 * 克隆动画组与 label 都不在 mesh 子树内（label 无 parent），只 dispose 子树会泄漏它们。
 */
export const disposeCharacterEntity = (entity: CharacterEntityRuntime) => {
	entity.animationController.stopAllAnimations();
	entity.builtinAnimations.forEach((group) => {
		group.dispose();
	});
	entity.customAnimations.forEach((group) => {
		group.dispose();
	});
	entity.builtinAnimations.clear();
	entity.customAnimations.clear();
	entity.mesh.dispose(false, true);
	entity.label?.dispose(false, true);
	entity.labelTexture?.dispose();
};

export type CharacterContentDeps = {
	setupCharacterContent: (characterId: string) => Promise<void>;
	teardownCharacterContent: () => void;
};

/**
 * 建角色内容 deps。宿主传入 scene / characterRoot 的取值器（它们在 createBaseScene 后才就绪）。
 * 工厂常驻复用：EntityFactory 的 GLB 模板缓存是实例级，每次 new 都会重新 ImportMesh 并把隐藏模板
 * 永久留在 scene。本模块内缓存同一工厂让模板只加载一次。
 */
export const createCharacterContentDeps = (handles: {
	getScene: () => Scene | undefined;
	getCharacterRoot: () => TransformNode | undefined;
}): CharacterContentDeps => {
	let characterFactory: EntityFactory | undefined;
	let characterEntity: CharacterEntityRuntime | undefined;
	let characterContentSeq = 0;

	return {
		setupCharacterContent: async (characterId) => {
			const scene = handles.getScene();
			if (!scene) throw new Error("SceneRuntime is not ready");
			const seq = ++characterContentSeq;
			characterFactory ??= new EntityFactory(scene);
			// 角色静态内容统一放在场景原点；装备交互没有显式视角契约时不改变相机。
			const entity = await characterFactory.createCharacter(characterId, characterId, new Vector3(0, 0, 0));
			const characterRoot = handles.getCharacterRoot();
			// 快速来回切换：异步加载期间若 seq 已被新请求/释放抢占，丢弃本次结果并完整清理。
			if (seq !== characterContentSeq || !characterRoot) {
				disposeCharacterEntity(entity);
				return;
			}
			// 挂到 characterRoot（修 createCharacter 未挂 root 的既有 bug）；label 不在子树内，靠 entity 句柄清理。
			entity.mesh.parent = characterRoot;
			entity.animationController.playBuiltinAnimation(BuiltinAnimationType.IDLE, { mode: "loop" });
			characterEntity = entity;
		},
		teardownCharacterContent: () => {
			// 序号自增使在途 setupCharacterContent 结果失配丢弃。
			characterContentSeq++;
			if (characterEntity) {
				disposeCharacterEntity(characterEntity);
				characterEntity = undefined;
			}
		},
	};
};
