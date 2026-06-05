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
 * 属性阈值穿越事件（ADR 0010：AttributeWatcher 降格为 ProcBus 事件源）。
 *
 * 由 AttributeThresholdSource 在监控属性跨越注册阈值的那一刻派发。
 * 起步阶段是**单一事件**：所有阈值穿越共用本事件名，订阅者在 predicate 里按 `path` +
 * 阈值过滤（per-path 拆位是文档化的升级路径，见 ADR 0010「未决」节）。
 *
 * payload 携带产生本事件的注册身份（`sourceId` + `registrationId`），使订阅者能在
 * predicate 里只认自己那一条注册，避免同 `(path, threshold)` 多源订阅时被彼此的跨越
 * 事件重复 / 错向唤醒（见 ADR 0010「代价」正确性条目）。
 */
export const AttrCrossedPayloadSchema = z.object({
	/** 派发本事件的注册来源 id（registlet/buff/passive skill）。 */
	sourceId: z.string(),
	/** 派发本事件的注册内部序号（AttributeThresholdSource.register 返回值）。 */
	registrationId: z.number(),
	/** 被监控的属性路径（如 `hp.current`）。 */
	path: z.string(),
	/** 注册的阈值数值。 */
	threshold: z.number(),
	/** 穿越前的值。 */
	oldValue: z.number(),
	/** 穿越后的值。 */
	newValue: z.number(),
	/** 实际穿越方向。 */
	direction: z.enum(["rising", "falling"]),
});

/**
 * 引擎启动时注入 EventCatalog 的首批事件集合。
 */
export const BUILT_IN_EVENTS: readonly EventDefinition[] = [
	{
		name: "status.entered",
		payloadSchema: StatusEnteredPayloadSchema,
		description: "状态实例进入，派发到本成员 ProcBus（StatusInstanceStore.apply → Member changeListener，ADR-0011）",
	},
	{
		name: "status.exited",
		payloadSchema: StatusExitedPayloadSchema,
		description: "状态实例离开（到期或主动移除），派发到本成员 ProcBus（ADR-0011）",
	},
	{
		name: "damage.received",
		payloadSchema: DamageReceivedPayloadSchema,
		description: "受击管线结算完毕后派发到本成员 ProcBus（ADR-0011，由 DamageResolution emit）",
	},
	{
		name: "skill.cast.completed",
		payloadSchema: SkillCastCompletedPayloadSchema,
		description: "施法者自身的技能完成事件（供爆能咏咒层累加等消费）",
	},
	{
		name: "attr.crossed",
		payloadSchema: AttrCrossedPayloadSchema,
		description: "属性值跨越注册阈值（AttributeThresholdSource 派发，见 ADR 0010）",
	},
] as const;

export type BuiltInEventName = (typeof BUILT_IN_EVENTS)[number]["name"];
