/**
 * 事件目录（扁平注册表）。
 */

import { z } from "zod/v4";

/**
 * 事件定义。
 */
export interface EventDefinition {
	/** 事件名（唯一 key，建议 dot-namespace：`status.entered` / `damage.received`）。 */
	name: string;
	/** payload 的 Zod schema。实际派发的 payload 形状。 */
	payloadSchema: z.ZodType;
	/** 调试描述。 */
	description: string;
}

/**
 * 扁平事件目录。构造后只读。
 */
export const EventCatalog = {
	death: {
		name: "death",
		payloadSchema: z.object({
			targetMemberId: z.string(),
		}),
		description: "角色死亡事件",
	},
	move_start: {
		name: "move_start",
		payloadSchema: z.object({
			targetMemberId: z.string(),
			direction: z.object({ x: z.number(), y: z.number(), z: z.number() }),
		}),
		description: "角色开始移动事件",
	},
	move_stop: {
		name: "move_stop",
		payloadSchema: z.object({
			targetMemberId: z.string(),
		}),
		description: "角色停止移动事件",
	},
} as const satisfies Record<string, EventDefinition>;

export type WorldEvent = (typeof EventCatalog)[keyof typeof EventCatalog];
