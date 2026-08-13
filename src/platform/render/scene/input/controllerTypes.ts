/** 水平面上的二维轴值或方向值，x 对应左右，z 对应前后。 */
export interface HorizontalVector {
	x: number;
	z: number;
}

export type ControllerInputSource = "keyboard" | "touch" | "gamepad" | "mixed";

/**
 * SAB 中实时移动状态的一致性快照。
 *
 * 它只表示消费者读取时的最新控制状态，不保存两个 Tick 之间被覆盖的中间方向。
 */
export interface SharedMovementStateSnapshot {
	layoutVersion: number;
	revision: number;
	enabled: boolean;
	moving: boolean;
	direction: HorizontalVector;
	intensity: number;
}

export interface ControllerActionBase {
	controllerId: string;
	sequence: number;
	timestampMs: number;
	source: ControllerInputSource;
}

/** 瞬时技能输入；是否被成员运行时接纳由下游语义边界决定。 */
export interface ControllerSkillTriggered extends ControllerActionBase {
	type: "skill_triggered";
	skillId: string;
}

/** 不可被后续状态覆盖、必须逐次交给下游处理的控制动作。 */
export type ControllerActionEvent = ControllerSkillTriggered;
