import type { CharacterWorldResource } from "../contracts/worldResource";

export const DEFAULT_CHARACTER_MODEL_URI = "/models/character.glb";

export const DEFAULT_CHARACTER_ANIMATION_CLIPS = {
	idle: "idle",
	walk: "walk",
	run: "run",
	jump: "jump",
	fall: "fall",
	land: "land",
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
