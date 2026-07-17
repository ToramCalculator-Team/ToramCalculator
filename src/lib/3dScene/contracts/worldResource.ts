import { z } from "zod/v4";

export const CharacterAnimationClipsSchema = z.object({
	idle: z.string().min(1),
	walk: z.string().min(1),
	run: z.string().min(1),
	jump: z.string().min(1),
	fall: z.string().min(1),
	land: z.string().min(1),
});

const WorldResourceBaseSchema = z.object({
	memberId: z.string(),
	resourceId: z.string(),
	displayName: z.string(),
});

const CharacterWorldResourceSchema = WorldResourceBaseSchema.extend({
	kind: z.literal("character"),
	model: z.object({ type: z.literal("gltf"), uri: z.string().min(1) }),
	appearance: z.object({ scale: z.number().positive() }),
	animation: z.object({ type: z.literal("embedded"), clips: CharacterAnimationClipsSchema }),
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
 * 渲染层按 memberId 将它与引擎动态消息汇合，避免逻辑引擎再次决定视觉形态。
 */
export const WorldResourceSchema = z.discriminatedUnion("kind", [CharacterWorldResourceSchema, MobWorldResourceSchema]);

export type CharacterAnimationClips = z.output<typeof CharacterAnimationClipsSchema>;
export type WorldResource = z.output<typeof WorldResourceSchema>;
export type CharacterWorldResource = Extract<WorldResource, { kind: "character" }>;
export type MobWorldResource = Extract<WorldResource, { kind: "mob" }>;
