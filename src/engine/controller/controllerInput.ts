/** 水平面上的二维方向，x 对应左右，z 对应前后。 */
export interface HorizontalVector {
	x: number;
	z: number;
}

/**
 * 输入设备发布的最新连续移动状态。
 *
 * 该契约只描述引擎需要消费的语义，不包含 SAB 布局、版本号或读取序号；具体传输实现可以替换。
 */
export interface ControllerMovementState {
	enabled: boolean;
	moving: boolean;
	direction: HorizontalVector;
	intensity: number;
}

/** 输入设备只能发布最新移动状态，不能取得共享内存或引擎附件生命周期。 */
export interface MovementStateSink {
	write(nextState: ControllerMovementState): void;
}
