import { z } from "zod/v4";

/**
 * 成员动作状态目录（ADR 0053）。
 *
 * 这是逻辑引擎与渲染资源共同遵守的稳定语义状态名。状态名不携带动画片段、
 * 时长或播放策略；状态帧只额外提供当前实例的逻辑时间边界，渲染器通过静态
 * 视觉资源把状态名映射到本地表现。
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
