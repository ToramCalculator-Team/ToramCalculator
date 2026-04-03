import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { createRendererController } from "./RendererController";
import type { EntityId } from "./RendererProtocol";

// ==================== 相机控制指令类型定义 ====================

export interface CameraControlCmd {
	type: "camera_control";
	entityId: EntityId;
	subType: "follow" | "free" | "setDistance" | "setAngle" | "setTarget";
	data: any;
	seq: number;
	ts: number;
}

export interface CameraFollowCmd extends CameraControlCmd {
	subType: "follow";
	data: {
		followEntityId: EntityId;
		distance?: number;
		verticalAngle?: number;
		horizontalAngle?: number;
	};
}

export interface CameraSetDistanceCmd extends CameraControlCmd {
	subType: "setDistance";
	data: {
		distance: number;
		smooth?: boolean;
	};
}

export interface CameraSetAngleCmd extends CameraControlCmd {
	subType: "setAngle";
	data: {
		horizontalAngle?: number;
		verticalAngle?: number;
		smooth?: boolean;
		delta?: boolean; // 是否为增量模式（用于FPS风格鼠标控制）
	};
}

export interface CameraSetTargetCmd extends CameraControlCmd {
	subType: "setTarget";
	data: {
		target: { x: number; y: number; z: number };
		smooth?: boolean;
	};
}

export type AnyCameraControlCmd = CameraFollowCmd | CameraSetDistanceCmd | CameraSetAngleCmd | CameraSetTargetCmd;

// ==================== 相机状态 ====================

export interface CameraState {
	/** 当前跟随的实体ID */
	followEntityId?: EntityId;
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

		// 暂时禁用每帧更新，只在状态改变时更新相机
		// this.updateCameraPosition(this.state.smoothTransition);
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

// ==================== 工具函数 ====================

/** 创建第三人称相机控制器的便捷函数 */
export function createThirdPersonController(
	scene: Scene,
	canvas: HTMLCanvasElement,
	rendererController: ReturnType<typeof createRendererController>,
	followEntityId?: EntityId,
	initialState?: Partial<CameraState>,
): { camera: ArcRotateCamera; controller: ThirdPersonCameraController } {
	// 创建ArcRotateCamera
	const camera = new ArcRotateCamera(
		"thirdPersonCamera",
		0, // alpha (水平角度)
		Math.PI / 6, // beta (垂直角度)
		8, // radius (距离)
		Vector3.Zero(), // target
		scene,
	);

	// 禁用默认控制
	camera.setTarget(new Vector3(0, 0, 0));
	camera.attachControl(canvas, false);

	// 创建控制器
	const controller = new ThirdPersonCameraController(scene, camera, rendererController, {
		followEntityId,
		...initialState,
	});

	return { camera, controller };
}

// ==================== 扩展渲染协议 ====================

// 扩展RendererCmd类型以包含相机控制
declare module "./RendererProtocol" {
	interface RendererCmdTypes {
		camera_control: AnyCameraControlCmd;
	}
}
