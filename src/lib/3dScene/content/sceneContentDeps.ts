/**
 * 角色内容编排 deps（内容编排关注点）。
 *
 * Character 与 realtime 共用 RendererController 世界内容入口；本模块只管理角色内容会话的
 * 异步抢占和清空，不再自行构造资源、创建实体或维护另一套释放逻辑。
 */

import type { Scene, TransformNode } from "~/lib/babylon/runtime";
import type { CharacterWorldResource } from "../contracts/worldResource";
import { createRendererController } from "../RendererController";
import { EntityFactory } from "./EntityFactory";

export type CharacterContentDeps = {
	setupCharacterContent: (resource: CharacterWorldResource) => Promise<void>;
	teardownCharacterContent: () => void;
};

/**
 * 建立角色内容依赖。EntityFactory 常驻复用模型模板缓存；每次会话使用独立控制器投影声明式资源。
 * 自增序号保证释放或新请求可以抢占在途模型加载，迟到结果会立即从统一控制器清除。
 */
export const createCharacterContentDeps = (handles: {
	getScene: () => Scene | undefined;
	getCharacterRoot: () => TransformNode | undefined;
}): CharacterContentDeps => {
	let characterFactory: EntityFactory | undefined;
	let activeController: ReturnType<typeof createRendererController> | undefined;
	let characterContentSeq = 0;

	const createController = () => {
		const scene = handles.getScene();
		const characterRoot = handles.getCharacterRoot();
		if (!scene || !characterRoot) throw new Error("SceneRuntime is not ready");
		characterFactory ??= new EntityFactory(scene, characterRoot);
		return createRendererController(scene, { entityFactory: characterFactory });
	};

	return {
		setupCharacterContent: async (resource) => {
			const seq = ++characterContentSeq;
			const contentController = createController();
			try {
				await contentController.applyWorldResources(
					[resource],
					[{ memberId: resource.memberId, position: { x: 0, y: 0, z: 0 }, yaw: 0 }],
				);
			} catch (error) {
				contentController.dispose();
				throw error;
			}
			if (seq !== characterContentSeq) {
				contentController.dispose();
				return;
			}
			activeController = contentController;
		},
		teardownCharacterContent: () => {
			characterContentSeq++;
			activeController?.dispose();
			activeController = undefined;
		},
	};
};
