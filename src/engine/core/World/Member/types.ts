import { z } from "zod/v4";
import type { AttributeContainerCheckpoint } from "./AttributeContainer/AttributeContainerTypes";
import type { EffectBtManagerCheckpoint } from "./EffectBehavior/types";
import type { StatusInstanceStoreCheckpoint } from "./runtime/Status/types";
import type { MemberFSMCheckpoint } from "./StateMachine/types";

/**
 * 成员域事件（引擎内部）
 */
export const MemberEventSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("state_changed"),
		memberId: z.string(),
		hp: z.number().nullable(),
		mp: z.number().nullable(),
		position: z
			.object({
				x: z.number(),
				y: z.number(),
				z: z.number(),
			})
			.optional(),
	}),
	z.object({
		type: z.literal("hit"),
		memberId: z.string(),
		sourceMemberId: z.string(),
		sourceSkillId: z.string().nullable(),
		damage: z.number(),
		hp: z.number().nullable(),
	}),
	z.object({
		type: z.literal("status_entered"),
		memberId: z.string(),
		statusType: z.string(),
		sourceId: z.string().optional(),
		timeMs: z.number(),
	}),
	z.object({
		type: z.literal("status_exited"),
		memberId: z.string(),
		statusType: z.string(),
		reason: z.enum(["expired", "removed"]),
		timeMs: z.number(),
	}),
	z.object({
		type: z.literal("skill_cast_accepted"),
		memberId: z.string(),
		skillId: z.string(),
		targetId: z.string(),
		inputId: z.string().optional(),
	}),
	z.object({
		type: z.literal("skill_input_rejected"),
		memberId: z.string(),
		skillId: z.string(),
		inputId: z.string().optional(),
	}),
	z.object({
		type: z.literal("target_selection_accepted"),
		memberId: z.string(),
		targetId: z.string(),
		inputId: z.string(),
	}),
	z.object({
		type: z.literal("target_selection_rejected"),
		memberId: z.string(),
		requestedTargetId: z.string(),
		inputId: z.string(),
	}),
	z.object({
		type: z.literal("death"),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("move_started"),
		memberId: z.string(),
		position: z.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
		}),
	}),
	z.object({
		type: z.literal("move_stopped"),
		memberId: z.string(),
		position: z.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
		}),
	}),
	z.object({
		type: z.literal("cast_progress"),
		memberId: z.string(),
		skillId: z.string(),
		progress: z.number(), // 0~1
	}),
	z.object({
		type: z.literal("skill_cast_denied"),
		memberId: z.string(),
		skillId: z.string(),
	}),
]);

export type MemberEvent = z.output<typeof MemberEventSchema>;

/** 单个成员的完整检查点 */
export interface MemberCheckpoint {
	memberId: string;
	fsm: MemberFSMCheckpoint;
	attributeContainer: AttributeContainerCheckpoint;
	statusStore: StatusInstanceStoreCheckpoint;
	effectBtManager: EffectBtManagerCheckpoint;
	pipelineOverlays: unknown;
	position: { x: number; y: number; z: number };
	/** 共享 runtime（plain data，可 postMessage） */
	runtime: unknown;
}
