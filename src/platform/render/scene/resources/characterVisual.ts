/** 当前角色资产正面朝 -z；固定偏移只作用于模型视觉节点，不进入实体世界朝向。 */
export const CHARACTER_MODEL_YAW_OFFSET = -Math.PI;

type CharacterModelNode = {
	rotation: { y: number };
	rotationQuaternion: {
		copyFromFloats: (x: number, y: number, z: number, w: number) => void;
	} | null;
};

/**
 * 一次性应用当前角色资产的正面朝向约定。
 * 模型节点保留资产缩放与坐标转换，后续逻辑 yaw 只更新其父级实体根节点。
 */
export function applyCharacterModelOrientation(node: CharacterModelNode): void {
	if (node.rotationQuaternion) {
		const half = CHARACTER_MODEL_YAW_OFFSET * 0.5;
		node.rotationQuaternion.copyFromFloats(0, Math.sin(half), 0, Math.cos(half));
		return;
	}
	node.rotation.y = CHARACTER_MODEL_YAW_OFFSET;
}
