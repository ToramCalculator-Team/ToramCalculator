import { z } from "zod/v4";
import { BUILT_IN_REGISTLETS_BY_ID } from "../../attachments/BuiltInRegistlets";
import type { MemberBtCapabilities } from "../BehaviourTree/BtManagerEnv";
import type { MemberFSMEvent } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";
import { type ConditionPool, defineCondition } from "./type";

type BtContext = MemberSharedRuntime<string>;
type BtCapabilities = MemberBtCapabilities<string, MemberFSMEvent>;

function currentCharacterOf(context: BtContext): unknown {
	if (!("character" in context)) return null;
	return (context as { character?: unknown }).character ?? null;
}

function currentSkillIdOf(context: BtContext): string | null {
	return (
		context.currentSkill?.data?.templateId ??
		context.currentSkill?.data?.template?.id ??
		context.currentSkill?.data?.id ??
		null
	);
}

export const CommonConditionPool = {
	/** 是否拥有指定名称的buff
	 *  @param treeName - 技能树名称
	 *  @returns 是否拥有指定名称的buff
	 */
	hasBuff: defineCondition(
		z.object({
			treeName: z.string(),
		}),
		(_context, input, capabilities) => {
			return capabilities.hasParallelBt(input.treeName);
		},
	),

	/** 是否处于胆怯状态 */
	isInCoweringState: defineCondition(z.object({}), (context) => {
		return context.statusTags.includes("cowering");
	}),

	/** 是否处于翻覆状态 */
	isInOverturnedState: defineCondition(z.object({}), (context) => {
		return context.statusTags.includes("overturned");
	}),

	/** 是否处于昏厥状态 */
	isInDizzyState: defineCondition(z.object({}), (context) => {
		return context.statusTags.includes("dizzy");
	}),

	/** 是否处于控制类异常中 */
	isInControlException: defineCondition(z.object({}), (context) => {
		const exceptionNames = ["cowering", "overturned", "dizzy"];
		return exceptionNames.some((name) => context.statusTags.includes(name));
	}),

	/**
	 * 判断当前技能分支是否被托环启用。
	 *
	 * 设计说明：
	 * - 托环的 skillBranchActivators 保留在 character.registlets 数据里。
	 * - 条件运行时直接搜索 character 数据，避免在 Member runtime 上缓存一份分支状态。
	 */
	isSkillBranchActivated: defineCondition(
		z.object({
			branchKey: z.string(),
			skillId: z.string().optional(),
			value: z.number().optional(),
		}),
		(context, input) => {
			const skillId = input.skillId ?? currentSkillIdOf(context);
			if (!skillId) return false;

			const character = currentCharacterOf(context) as {
				registlets?: Array<{
					templateId?: string;
					template?: {
						skillBranchActivators?: Array<{
							skillId: string;
							branchKey: string;
							value: number;
						}>;
					} | null;
				}>;
			} | null;
			const rings = Array.isArray(character?.registlets) ? character.registlets : [];
			for (const ring of rings) {
				const activators =
					ring.template?.skillBranchActivators ??
					(ring.templateId ? BUILT_IN_REGISTLETS_BY_ID.get(ring.templateId)?.skillBranchActivators : undefined) ??
					[];
				for (const activator of activators) {
					if (activator.skillId !== skillId || activator.branchKey !== input.branchKey) continue;
					if (input.value === undefined) return activator.value !== 0;
					return activator.value === input.value;
				}
			}
			return false;
		},
	),
} as const satisfies ConditionPool<BtContext, string, MemberFSMEvent, BtCapabilities>;

export type CommonConditionPool = typeof CommonConditionPool;
