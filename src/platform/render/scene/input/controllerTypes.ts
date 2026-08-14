/** 瞬时技能输入；是否被成员运行时接纳由下游语义边界决定。 */
export interface ControllerSkillTriggered {
	type: "skill_triggered";
	skillId: string;
}

/** 瞬时跳跃输入；起跳是否接纳以及垂直运动均由成员状态机和引擎物理决定。 */
export interface ControllerJumpTriggered {
	type: "jump_triggered";
}

/** 不可被后续状态覆盖、必须逐次交给下游处理的控制动作。 */
export type ControllerActionEvent = ControllerSkillTriggered | ControllerJumpTriggered;
