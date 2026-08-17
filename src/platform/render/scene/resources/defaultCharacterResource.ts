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

/** 当前角色 Walk/Run 片段在 1 倍速播放时已经校准匹配的世界速度。 */
export const DEFAULT_CHARACTER_LOCOMOTION_ANIMATION = {
	walkReferenceSpeed: 1.05,
	runReferenceSpeed: 2.1,
} as const satisfies CharacterWorldResource["animation"]["locomotion"];

const SKILL_ATTACK_DURATION_MS = 2300;
const SKILL_ATTACK_IMPACT_PROGRESS = 0.5;

/** 逻辑状态到内嵌动画片段的默认映射；真实资产绑定后由场景解析覆盖。 */
export const DEFAULT_CHARACTER_STATE_ANIMATIONS = {
	idle: { clip: "Idle", durationMs: 1000, play: "loop" },
	block: { clip: "Idle", durationMs: 500, play: "hold" },
	dodge: { clip: "Run", durationMs: 500, play: "once" },
	controlled: { clip: "Idle", durationMs: 1000, play: "loop" },
	dead: { clip: "Idle", durationMs: 1000, play: "hold" },
	"skill.busy": { clip: "Idle", durationMs: 1000, play: "loop" },
	"skill.chanting": { clip: "Idle", durationMs: 1000, play: "loop" },
	"skill.charging": { clip: "Idle", durationMs: 1000, play: "loop" },
	"skill.startup": {
		clip: "Skill_attack",
		durationMs: SKILL_ATTACK_DURATION_MS * SKILL_ATTACK_IMPACT_PROGRESS,
		play: "once",
		range: { start: 0, end: SKILL_ATTACK_IMPACT_PROGRESS },
	},
	"skill.active": {
		clip: "Skill_attack",
		durationMs: 100,
		play: "hold",
		range: { start: SKILL_ATTACK_IMPACT_PROGRESS, end: SKILL_ATTACK_IMPACT_PROGRESS },
	},
	"skill.recovery": {
		clip: "Skill_attack",
		durationMs: SKILL_ATTACK_DURATION_MS * (1 - SKILL_ATTACK_IMPACT_PROGRESS),
		play: "once",
		range: { start: SKILL_ATTACK_IMPACT_PROGRESS, end: 1 },
	},
} as const satisfies CharacterWorldResource["animation"]["states"];

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
		animation: {
			type: "embedded",
			clips: DEFAULT_CHARACTER_ANIMATION_CLIPS,
			locomotion: DEFAULT_CHARACTER_LOCOMOTION_ANIMATION,
			states: DEFAULT_CHARACTER_STATE_ANIMATIONS,
		},
	};
}
