import type { Scene } from "~/lib/babylon/runtime";
import { type ArcRotateCamera, Vector3 } from "~/lib/babylon/runtime";
import type { createRendererController } from "../RendererController";
import type {
	AnyCameraControlCmd,
	CameraFollowCmd,
	CameraSetAngleCmd,
	CameraSetDistanceCmd,
	CameraSetTargetCmd,
} from "./commands";

// ==================== 相机状态 ====================

export interface CameraState {
	/** 当前跟随的实体ID */
	followEntityId?: string;
	/** 相机距离 */
	distance: number;
	/** 水平角度（弧度） */
	horizontalAngle: number;
	/** 垂直角度（弧度） */
	verticalAngle: number;
	/** 目标位置 */
	target: Vector3;
	/** 是否启用平滑过渡 */
	smoothTransition: boolean;
	/** 最小距离 */
	minDistance: number;
	/** 最大距离 */
	maxDistance: number;
	/** 最小垂直角度 */
	minVerticalAngle: number;
	/** 最大垂直角度 */
	maxVerticalAngle: number;
}

// ==================== 默认设置 ====================

const defaultCameraState: CameraState = {
	distance: 3.12,
	horizontalAngle: 1.58,
	verticalAngle: 1.5,
	target: new Vector3(0, 0.43, 0),
	smoothTransition: false, // 暂时禁用平滑过渡，提高响应性
	minDistance: 2,
	maxDistance: 20,
	minVerticalAngle: -Math.PI / 2 + 0.1,
	maxVerticalAngle: Math.PI / 2 - 0.1,
};

// ==================== 第三人称相机控制器 ====================

export class ThirdPersonCameraController {
	private scene: Scene;
	private camera: ArcRotateCamera;
	private rendererController: ReturnType<typeof createRendererController>;
	private state: CameraState;

	// 平滑过渡相关
	private targetState: Partial<CameraState> = {};
	private isTransitioning = false;
	private transitionSpeed = 5; // 过渡速度

	// 无限地面相关
	private infiniteGroundConfig = {
		enabled: true,
		stepX: 0.1,
		stepZ: 0.1,
		snapAngle: Math.PI / 3, // 60度对齐
	};

	constructor(
		scene: Scene,
		camera: ArcRotateCamera,
		rendererController: ReturnType<typeof createRendererController>,
		initialState: Partial<CameraState> = {},
	) {
		this.scene = scene;
		this.camera = camera;
		this.rendererController = rendererController;
		this.state = { ...defaultCameraState, ...initialState };

		// 初始化相机位置
		this.updateCameraAngle();
		// 立即对准初始 target（如预摆位传入的主控成员位置），避免首帧前停在原点。
		this.camera.setTarget(this.state.target.clone());

		// 设置无限地面逻辑
		// this.setupInfiniteGround();

		// console.log("🎥 第三人称相机控制器已初始化");
	}

	// ==================== 公共API ====================

	/** 处理相机控制指令 */
	handleCameraCommand(cmd: AnyCameraControlCmd): void {
		switch (cmd.subType) {
			case "follow":
				this.handleFollowCommand(cmd as CameraFollowCmd);
				break;
			case "setDistance":
				this.handleSetDistanceCommand(cmd as CameraSetDistanceCmd);
				break;
			case "setAngle":
				this.handleSetAngleCommand(cmd as CameraSetAngleCmd);
				break;
			case "setTarget":
				this.handleSetTargetCommand(cmd as CameraSetTargetCmd);
				break;
			default:
				console.warn("未知的相机控制指令:", cmd);
		}
	}

	/** 更新相机（每帧调用） */
	update(deltaTime: number): void {
		// 更新跟随目标位置
		this.updateFollowTarget();

		// 处理平滑过渡
		if (this.isTransitioning) {
			this.updateTransition(deltaTime);
		}

		// 把 state 应用到真实相机：恢复缺失的跟随与入场动画。
		this.applyStateToCamera(deltaTime);
	}

	/**
	 * 把内部 state 应用到真实 ArcRotateCamera。
	 * - target：代码独占维度（鼠标只改 alpha/beta/radius），每帧朝 state.target 平滑插值，产生跟随与初始入场动画。
	 * - distance/angle：仅在过渡进行时由代码驱动；过渡结束后交还鼠标控制，避免与用户输入打架。
	 */
	private applyStateToCamera(deltaTime: number): void {
		const lerp = this.state.smoothTransition ? Math.min(1, this.transitionSpeed * deltaTime) : 1;
		const nextTarget = Vector3.Lerp(this.camera.getTarget(), this.state.target, lerp);
		this.camera.setTarget(nextTarget);

		if (this.isTransitioning) {
			this.camera.radius = this.state.distance;
			this.camera.alpha = this.state.horizontalAngle;
			this.camera.beta = this.state.verticalAngle;
		}
	}

	/** 获取当前相机状态 */
	getCameraState(): CameraState {
		return { ...this.state };
	}

	/** 设置相机状态 */
	setCameraState(newState: Partial<CameraState>, smooth = true): void {
		if (smooth && this.state.smoothTransition) {
			this.startTransition(newState);
		} else {
			Object.assign(this.state, newState);
			this.updateCameraAngle();
		}
	}

	// ==================== 指令处理方法 ====================

	private handleFollowCommand(cmd: CameraFollowCmd): void {
		const { followEntityId, distance, verticalAngle, horizontalAngle } = cmd.data;

		const newState: Partial<CameraState> = {
			followEntityId,
		};

		// 只有明确提供了新值才更新，否则保持当前角度
		if (distance !== undefined)
			newState.distance = Math.max(this.state.minDistance, Math.min(this.state.maxDistance, distance));

		// 重要修改：只有在明确提供角度且不是默认值时才更新角度
		// 这样可以保持用户当前的视角，避免重置到固定角度
		if (verticalAngle !== undefined && verticalAngle !== Math.PI / 6) {
			newState.verticalAngle = Math.max(
				this.state.minVerticalAngle,
				Math.min(this.state.maxVerticalAngle, verticalAngle),
			);
		}
		if (horizontalAngle !== undefined && horizontalAngle !== 0) {
			newState.horizontalAngle = horizontalAngle;
		}

		this.setCameraState(newState, true);

		// console.log(`🎥 相机开始跟随实体: ${followEntityId}，保持当前角度: H${this.state.horizontalAngle.toFixed(3)} V${this.state.verticalAngle.toFixed(3)}`);
	}

	private handleSetDistanceCommand(cmd: CameraSetDistanceCmd): void {
		const { distance, smooth = true } = cmd.data;
		const clampedDistance = Math.max(this.state.minDistance, Math.min(this.state.maxDistance, distance));

		this.setCameraState({ distance: clampedDistance }, smooth);
	}

	private handleSetAngleCommand(cmd: CameraSetAngleCmd): void {
		const { horizontalAngle, verticalAngle, smooth = true, delta = false } = cmd.data;

		const newState: Partial<CameraState> = {};

		if (horizontalAngle !== undefined) {
			if (delta) {
				// 增量模式：用于FPS风格的鼠标控制
				newState.horizontalAngle = this.state.horizontalAngle + horizontalAngle;
			} else {
				// 绝对模式：直接设置角度
				newState.horizontalAngle = horizontalAngle;
			}
		}

		if (verticalAngle !== undefined) {
			let newVerticalAngle: number;
			if (delta) {
				// 增量模式：累加当前角度
				newVerticalAngle = this.state.verticalAngle + verticalAngle;
			} else {
				// 绝对模式：直接设置角度
				newVerticalAngle = verticalAngle;
				// console.log(`🎥 垂直角度绝对: ${verticalAngle}`);
			}

			// 限制垂直角度范围
			const clampedAngle = Math.max(
				this.state.minVerticalAngle,
				Math.min(this.state.maxVerticalAngle, newVerticalAngle),
			);
			newState.verticalAngle = clampedAngle;

			if (clampedAngle !== newVerticalAngle) {
				// console.log(`🎥 垂直角度被限制: ${newVerticalAngle} -> ${clampedAngle}`);
			}
		}

		this.setCameraState(newState, smooth);
	}

	private handleSetTargetCommand(cmd: CameraSetTargetCmd): void {
		const { target, smooth = true } = cmd.data;
		const newTarget = new Vector3(target.x, target.y, target.z);

		this.setCameraState({ target: newTarget }, smooth);
	}

	// ==================== 内部更新方法 ====================

	private updateFollowTarget(): void {
		if (!this.state.followEntityId) return;

		const pose = this.rendererController.getEntityPose(this.state.followEntityId);
		if (pose) {
			// 设置目标位置为实体位置上方一点
			this.state.target.copyFromFloats(pose.pos.x, pose.pos.y + 1, pose.pos.z);
		}
	}

	private updateCameraAngle(): void {
		const { horizontalAngle, verticalAngle } = this.state;
		this.camera.alpha = horizontalAngle;
		this.camera.beta = verticalAngle;
	}

	private startTransition(newState: Partial<CameraState>): void {
		this.targetState = { ...newState };
		this.isTransitioning = true;
	}

	private updateTransition(deltaTime: number): void {
		if (!this.isTransitioning) return;

		const speed = this.transitionSpeed * deltaTime;
		let hasChanges = false;

		// 平滑过渡各个属性
		for (const [key, targetValue] of Object.entries(this.targetState)) {
			if (targetValue === undefined) continue;

			const currentValue = (this.state as any)[key];

			if (key === "target" && targetValue instanceof Vector3) {
				// 特殊处理Vector3
				const diff = targetValue.subtract(currentValue);
				if (diff.length() > 0.01) {
					const lerped = Vector3.Lerp(currentValue, targetValue, speed);
					(this.state as any)[key] = lerped;
					hasChanges = true;
				}
			} else if (typeof targetValue === "number" && typeof currentValue === "number") {
				// 处理数值
				const diff = targetValue - currentValue;
				if (Math.abs(diff) > 0.01) {
					(this.state as any)[key] = currentValue + diff * speed;
					hasChanges = true;
				}
			} else {
				// 直接赋值其他类型
				(this.state as any)[key] = targetValue;
			}
		}

		// 如果所有属性都已接近目标值，结束过渡
		if (!hasChanges) {
			this.isTransitioning = false;
			this.targetState = {};
		}
	}

	/** 销毁控制器 */
	dispose(): void {
		this.isTransitioning = false;
		this.targetState = {};
		// console.log("🎥 第三人称相机控制器已销毁");
	}

	// ==================== 私有方法 ====================

	/** 设置无限地面逻辑 */
	private setupInfiniteGround(): void {
		if (!this.infiniteGroundConfig.enabled) return;

		const root = this.scene.getMeshByName("__root__");
		if (!root) {
			console.warn("🎥 未找到__root__网格，无法启用无限地面");
			return;
		}

		// 禁用四元数旋转，使用欧拉角
		root.rotationQuaternion = null;

		// 在每帧渲染前更新地面位置
		this.scene.onBeforeRenderObservable.add(() => {
			if (!this.infiniteGroundConfig.enabled) return;

			const { stepX, stepZ, snapAngle } = this.infiniteGroundConfig;

			// 根据相机位置对齐地面位置
			root.position.x = Math.round(this.camera.position.x / stepX) * stepX;
			root.position.z = Math.round(this.camera.position.z / stepZ) * stepZ;

			// 根据相机旋转对齐地面朝向
			const rotationY = this.camera.absoluteRotation.toEulerAngles().y - Math.PI;
			root.rotation.y = Math.round(rotationY / snapAngle) * snapAngle;
		});

		console.log("🎥 无限地面已启用", this.infiniteGroundConfig);
	}
}
