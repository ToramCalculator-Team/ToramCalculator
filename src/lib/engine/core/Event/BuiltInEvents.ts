/**
 * 引擎内置事件定义。
 *
 * 用于构造 Worker 级 `EventCatalog`。新增事件类型必须在此处登记（或通过引擎初始化时
 * 合并扩展目录），否则订阅/派发会抛错。
 *
 * 命名约定：`<domain>.<verb>` 形式，小写 dot-namespace。
 */

import { z } from "zod/v4";
import type { EventDefinition } from "./EventCatalog";

/** 状态进入事件。 */
export const StatusEnteredPayloadSchema = z.object({
	/** StatusInstance.type（例：`Flinch` / `Ignition`）。 */
	type: z.string(),
	/** 来源（施法者 id / registlet id 等）。 */
	sourceId: z.string().optional(),
	/** 该次 apply 所在帧号。 */
	frame: z.number(),
});

/** 状态离开事件（自然到期 / 被主动移除）。 */
export const StatusExitedPayloadSchema = z.object({
	type: z.string(),
	/** 离开原因。`expired` 到期，`removed` 主动移除。 */
	reason: z.enum(["expired", "removed"]),
	frame: z.number(),
});

/** 受击事件（受击管线结算完毕后派发）。 */
export const DamageReceivedPayloadSchema = z.object({
	/** 最终伤害（hitResolve / damageCalc 产出的 finalDamage）。 */
	finalDamage: z.number(),
	/** 是否命中。 */
	hit: z.boolean(),
	/** 是否暴击。 */
	crit: z.boolean(),
	/** 是否为本次致死伤害。 */
	isFatal: z.boolean(),
	/** 伤害来源 id。 */
	sourceId: z.string(),
	/** 伤害归因标签快照。 */
	damageTags: z.array(z.string()),
	/** 派发帧号。 */
	frame: z.number(),
});

/** 技能咏唱/施展完成事件（施法者自身派发，供爆能咏咒层累加等消费）。 */
export const SkillCastCompletedPayloadSchema = z.object({
	skillId: z.string(),
	/** 技能所属树/类别，供订阅侧做 predicate 过滤。 */
	skillTreeType: z.string().optional(),
	frame: z.number(),
});

/**
 * 引擎启动时注入 EventCatalog 的首批事件集合。
 */
export const BUILT_IN_EVENTS: readonly EventDefinition[] = [
	{
		name: "status.entered",
		payloadSchema: StatusEnteredPayloadSchema,
		description: "状态实例进入（StatusInstanceStore.apply 派发）",
	},
	{
		name: "status.exited",
		payloadSchema: StatusExitedPayloadSchema,
		description: "状态实例离开（到期或主动移除）",
	},
	{
		name: "damage.received",
		payloadSchema: DamageReceivedPayloadSchema,
		description: "受击管线结算完毕后派发",
	},
	{
		name: "skill.cast.completed",
		payloadSchema: SkillCastCompletedPayloadSchema,
		description: "施法者自身的技能完成事件（供爆能咏咒层累加等消费）",
	},
] as const;

export type BuiltInEventName = (typeof BUILT_IN_EVENTS)[number]["name"];
