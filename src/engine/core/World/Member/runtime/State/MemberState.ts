import { z } from "zod/v4";

/**
 * 成员动作状态目录（ADR 0053）。
 *
 * 这是逻辑引擎与渲染资源共同遵守的稳定语义状态名。状态名不携带动画片段、
 * 时长或播放策略；渲染器通过静态视觉资源把状态名映射到本地动画。
 */
export const MEMBER_STATE_NAMES = [
	"idle",
	"dead",
	"controlled",
	"block",
	"dodge",
	"skill.busy",
	"skill.chanting",
	"skill.charging",
	"skill.startup",
	"skill.active",
	"skill.recovery",
] as const;

export type MemberStateName = (typeof MEMBER_STATE_NAMES)[number];
export const MemberStateNameSchema = z.enum(MEMBER_STATE_NAMES);

/**
 * 状态源向投影器提交的状态声明。
 * sequence 只用于投影器区分同状态名的连续声明，不进入 SAB 或渲染器。
 */
export interface MemberStateDeclaration {
	name: MemberStateName;
	timeMs: number;
	sequence: number;
}

/** 每 Tick 投影后的最终成员状态帧；这是实时状态 SAB 的唯一动作状态来源。 */
export interface MemberStateFrameEntry {
	name: MemberStateName;
	instance: number;
	startedAtLogicalTimeMs: number;
}
