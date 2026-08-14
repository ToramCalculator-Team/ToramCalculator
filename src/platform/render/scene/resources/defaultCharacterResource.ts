import type { CharacterWorldResource } from "../contracts/worldResource";

export const DEFAULT_CHARACTER_MODEL_URI = "/models/character.glb";

export const DEFAULT_CHARACTER_ANIMATION_CLIPS = {
	// character.glb 的内嵌动画使用资产原名；逻辑动作仍使用稳定的语义键。
	idle: "Idle",
	walk: "Walk",
	run: "Run",
	jump: "Jump_start",
	fall: "Jump_start",
	land: "Jump_end",
} as const satisfies CharacterWorldResource["animation"]["clips"];

/**
 * 在真实角色资产绑定落地前，集中构造默认角色视觉资源。
 * 调用方必须提供业务身份与显示名，渲染消费端不得再根据 characterId 猜测这些事实。
 */
export function createDefaultCharacterWorldResource(input: {
	memberId: string;
	resourceId: string;
	displayName: string;
}): CharacterWorldResource {
	return {
		...input,
		kind: "character",
		model: { type: "gltf", uri: DEFAULT_CHARACTER_MODEL_URI },
		appearance: { scale: 1 },
		animation: { type: "embedded", clips: DEFAULT_CHARACTER_ANIMATION_CLIPS },
	};
}
