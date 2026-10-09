import { MEMBER_TYPE } from "@db/schema/enums";
import { z } from "zod/v4";
import { AttributeSnapshotSchema } from "./runtime/AttributeContainer/AttributeContainerTypes";

/**
 * Member 序列化契约。
 * 用于跨模块传输、持久化或网络同步。
 */
export const MemberSnapshotSchema = z.object({
	attrs: AttributeSnapshotSchema,
	id: z.string(),
	type: z.enum(MEMBER_TYPE),
	name: z.string(),
	campId: z.string(),
	teamId: z.string(),
	position: z.object({
		x: z.number(),
		y: z.number(),
		z: z.number(),
	}),
});

export type MemberSnapshot = z.output<typeof MemberSnapshotSchema>;
