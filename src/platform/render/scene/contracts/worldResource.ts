import { z } from "zod/v4";
import { type MemberStateName, MemberStateNameSchema } from "~/engine/core/World/Member/runtime/State/MemberState";

export const CharacterAnimationClipsSchema = z.object({
	idle: z.string().min(1),
	walk: z.string().min(1),
	run: z.string().min(1),
	jump: z.string().min(1),
	fall: z.string().min(1),
	land: z.string().min(1),
});

export const CharacterLocomotionAnimationSchema = z.object({
	/** 当前 Walk 片段以 1 倍播放时对应的视觉移动速度（m/s）。 */
	walkReferenceSpeed: z.number().positive(),
	/** 当前 Run 片段以 1 倍播放时对应的视觉移动速度（m/s）。 */
	runReferenceSpeed: z.number().positive(),
});

export const StatePlayModeSchema = z.enum(["once", "loop", "hold"]);
export const StateAnimationRangeSchema = z
	.object({
		start: z.number().min(0).max(1),
		end: z.number().min(0).max(1),
	})
	.refine((range) => range.start <= range.end, {
		message: "动画片段区间的 end 不能小于 start",
		path: ["end"],
	});
export const StateAnimationMappingSchema = z.record(
	MemberStateNameSchema,
	z.object({
		clip: z.string().min(1),
		durationMs: z.number().positive(),
		play: StatePlayModeSchema.default("once"),
		/** 在内嵌动画片段中使用的归一化区间；未设置时使用完整片段。 */
		range: StateAnimationRangeSchema.optional(),
	}),
);

const WorldResourceBaseSchema = z.object({
	memberId: z.string(),
	resourceId: z.string(),
	displayName: z.string(),
	/** SAB 中只保存此索引，模型和动画映射留在渲染器静态注册表。 */
	visualProfileId: z.number().int().nonnegative().optional(),
});

const CharacterWorldResourceSchema = WorldResourceBaseSchema.extend({
	kind: z.literal("character"),
	model: z.object({ type: z.literal("gltf"), uri: z.string().min(1) }),
	appearance: z.object({ scale: z.number().positive() }),
	animation: z.object({
		type: z.literal("embedded"),
		clips: CharacterAnimationClipsSchema,
		locomotion: CharacterLocomotionAnimationSchema,
		states: StateAnimationMappingSchema,
	}),
});

const MobWorldResourceSchema = WorldResourceBaseSchema.extend({
	kind: z.literal("mob"),
	model: z.object({ type: z.literal("primitive"), shape: z.literal("sphere") }),
	appearance: z.object({ radius: z.number().positive(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
	animation: z.null(),
});

/**
 * 场景解析与渲染层之间的静态资源契约。
 *
 * 它只描述实体模型、外观和动画资源，不携带位置、朝向、HP 等动态运行事实；
 * 渲染层按 visualProfileId 将它与实时世界状态汇合，避免逻辑引擎决定视觉形态。
 */
export const WorldResourceSchema = z.discriminatedUnion("kind", [CharacterWorldResourceSchema, MobWorldResourceSchema]);

export type CharacterAnimationClips = z.output<typeof CharacterAnimationClipsSchema>;
export type CharacterLocomotionAnimation = z.output<typeof CharacterLocomotionAnimationSchema>;
export type StatePlayMode = z.output<typeof StatePlayModeSchema>;
export type StateAnimationMapping = z.output<typeof StateAnimationMappingSchema>;
export type StateAnimationEntry = StateAnimationMapping[MemberStateName];
export type WorldResource = z.output<typeof WorldResourceSchema>;
export type CharacterWorldResource = Extract<WorldResource, { kind: "character" }>;
export type MobWorldResource = Extract<WorldResource, { kind: "mob" }>;
