import { z } from "zod/v4";
import type { TreeData } from "~/lib/behavior3/tree";

/**
 * SkillEffectLogic（技能效果 JSON）
 *
 * 设计约束（当前共识）：
 * - 行为树（behavior3 JSON）由用户自定义，作为 skillEffect.logic 的主要载体
 * - 行为树节点只产出 Intent，由 Resolver 统一执行
 * - 允许“属性修改”类积木通过表达式修改上下文（属于节点参数），但不允许注入自定义计算 stage（不允许 script stage）
 * - Pipeline 仅允许 override 编排（actionGroupDef），Stage 实现必须来自内置 actionPool
 * - Buff/Area 在技能 JSON 内声明；Area 先用简化结构，后续可演进为关键帧/更复杂描述
 */

/* ------------------------------ behavior3 TreeData ------------------------------ */

const Behavior3NodeDataSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    // behavior3 的 NodeData.id 在类型里是 string；为兼容历史/测试数据，也允许 number
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    desc: z.string().optional().default(""),
    args: z.record(z.string(), z.unknown()).optional().default({}),
    debug: z.boolean().optional(),
    disabled: z.boolean().optional(),
    input: z.array(z.string()).optional().default([]),
    output: z.array(z.string()).optional().default([]),
    children: z.array(Behavior3NodeDataSchema).optional().default([]),
    // `tree` 字段由运行时注入，序列化数据中可以不存在
    tree: z.unknown().optional(),
  }),
);

export const Behavior3TreeDataSchema: z.ZodType<TreeData> = z.object({
  name: z.string(),
  desc: z.string().optional().default(""),
  root: Behavior3NodeDataSchema,
  group: z.array(z.string()).optional().default([]),
}) as unknown as z.ZodType<TreeData>;

/* ---------------------------------- Pipeline ---------------------------------- */

export const PipelineOverridesSchema = z.record(z.string(), z.array(z.string()));

/* ----------------------------------- BuffDef ---------------------------------- */

export const SkillBuffDefSchema = z.object({
  /** buff 实例 ID（用于共享/跨技能） */
  id: z.string(),
  name: z.string().optional(),
  /** -1 表示永久 */
  durationMs: z.number(),
  maxStacks: z.number().optional(),
  refreshable: z.boolean().optional(),
  /** buff 内变量（计数器/标记等） */
  variables: z.record(z.string(), z.union([z.number(), z.boolean()])).optional(),
  /** 绑定的 buffTreeId（在 trees.buffBTs 中查找） */
  treeId: z.string(),
});

export type SkillBuffDef = z.output<typeof SkillBuffDefSchema>;

/* ----------------------------------- AreaDef ---------------------------------- */

export const AreaShapeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("point") }),
  z.object({ type: z.literal("circle"), radius: z.number() }),
  z.object({ type: z.literal("rect"), width: z.number(), length: z.number() }),
]);

export const AreaAnchorSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("caster"),
    offset: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  }),
  z.object({
    type: z.literal("target"),
    offset: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  }),
  z.object({
    type: z.literal("position"),
    position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  }),
]);

export const AreaTargetingSchema = z.object({
  camp: z.enum(["enemy", "ally", "all"]).optional(),
  includeSelf: z.boolean().optional(),
});

export const SkillAreaDefSchema = z.object({
  /** 区域实例 ID（用于共享/跨技能） */
  id: z.string(),
  name: z.string().optional(),
  durationMs: z.number(),
  tickIntervalFrames: z.number().optional(),
  shape: AreaShapeSchema,
  anchor: AreaAnchorSchema.optional(),
  targeting: AreaTargetingSchema.optional(),
  /** 绑定的 areaTreeId（在 trees.areaBTs 中查找） */
  treeId: z.string(),
});

export type SkillAreaDef = z.output<typeof SkillAreaDefSchema>;

/* ------------------------------ SkillEffectLogic v1 ----------------------------- */

export const SkillEffectLogicV1Schema = z.object({
  schemaVersion: z.literal(1),

  /** 可选：给 BT/表达式用的参数 */
  params: z.record(z.string(), z.unknown()).optional(),

  /** 自定义管线（只允许 override 编排，不允许自定义 stage 实现） */
  pipelines: z
    .object({
      overrides: PipelineOverridesSchema.optional(),
    })
    .optional(),

  /** 行为树定义（behavior3 TreeData） */
  trees: z.object({
    skillBT: Behavior3TreeDataSchema,
    buffBTs: z.record(z.string(), Behavior3TreeDataSchema).optional(),
    areaBTs: z.record(z.string(), Behavior3TreeDataSchema).optional(),
  }),

  /** 技能内声明的 buff 实例 */
  buffs: z.array(SkillBuffDefSchema).optional(),

  /** 技能内声明的区域实例（先用简化结构） */
  areas: z.array(SkillAreaDefSchema).optional(),
});

export type SkillEffectLogicV1 = z.output<typeof SkillEffectLogicV1Schema>;

/** 未来多版本兼容入口（当前只有 v1） */
export const SkillEffectLogicSchema = SkillEffectLogicV1Schema;
export type SkillEffectLogic = SkillEffectLogicV1;

