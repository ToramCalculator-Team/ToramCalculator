import { PlayerBodyProfile } from "~/game/locomotion";
import type { Scene } from "~/platform/render/babylon/runtime";
import { type ArcRotateCamera, Vector3 } from "~/platform/render/babylon/runtime";
import type { createRendererController } from "../RendererController";
import { CAMERA_EFFECTIVE_RADIUS_MIN, CAMERA_RADIUS_LIMITS, FOLLOW_POSE } from "./cameraTransition";
import type {
	AnyCameraControlCmd,
	CameraFollowCmd,
	CameraSetAngleCmd,
	CameraSetDistanceCmd,
	CameraSetTargetCmd,
} from "./commands";

// ==================== 相机-地形碰撞 ====================

/** 视线步进间隔：地形是平滑高度场，0.5 步长配合二分细化足够精确。 */
const CAMERA_GROUND_COLLISION_STEP = 0.5;
/** 相机离地感应间距：视线距离地面不足 0.1m 时就开始收缩半径，避免贴地后再硬拉。 */
const CAMERA_GROUND_CLEARANCE = 0.1;
/** 碰撞解除后半径向命令距离恢复的 lerp 速率（/秒）。 */
const CAMERA_RADIUS_RECOVERY_SPEED = 8;

export type CameraCollisionVector = Readonly<{ x: number; y: number; z: number }>;
export type CameraTerrainHeightSampler = (x: number, z: number) => number;

/**
 * 在给定视线方向上求地形的首次交点。
 *
 * 该函数只处理高度场求交，不读取 Babylon 状态；控制器可以在普通帧和动画帧复用同一算法，
 * 测试也可以直接验证安全距离而不需要创建 WebGL 场景。direction 必须是单位向量。
 */
export function computeTerrainCollisionLimit(
	target: CameraCollisionVector,
	direction: CameraCollisionVector,
	currentDistance: number,
	desiredDistance: number,
	terrainHeightAt: CameraTerrainHeightSampler,
): number {
	const probeDistance = Math.max(Math.max(0, currentDistance), desiredDistance);
	if (probeDistance < 1e-3) return Number.POSITIVE_INFINITY;

	let hitDistance = -1;
	for (let d = 0; d <= probeDistance; d += CAMERA_GROUND_COLLISION_STEP) {
		const pointX = target.x + direction.x * d;
		const pointY = target.y + direction.y * d;
		const pointZ = target.z + direction.z * d;
		if (pointY < terrainHeightAt(pointX, pointZ) + CAMERA_GROUND_CLEARANCE) {
			hitDistance = d;
			break;
		}
	}
	if (hitDistance < 0) return Number.POSITIVE_INFINITY;

	// 在 [hit-STEP, hit] 内二分细化碰撞点，极限取最后一个安全位置。
	let safe = Math.max(0, hitDistance - CAMERA_GROUND_COLLISION_STEP);
	let hit = hitDistance;
	for (let i = 0; i < 6; i += 1) {
		const mid = (safe + hit) / 2;
		const pointX = target.x + direction.x * mid;
		const pointY = target.y + direction.y * mid;
		const pointZ = target.z + direction.z * mid;
		if (pointY < terrainHeightAt(pointX, pointZ) + CAMERA_GROUND_CLEARANCE) hit = mid;
		else safe = mid;
	}
	return Math.max(safe, CAMERA_EFFECTIVE_RADIUS_MIN);
}

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
	horizontalAngle: FOLLOW_POSE.alpha,
	verticalAngle: 1.5,
	target: new Vector3(0, PlayerBodyProfile.CAMERA_IDLE_TARGET_Y, 0),
	smoothTransition: false, // 暂时禁用平滑过渡，提高响应性
	minDistance: CAMERA_RADIUS_LIMITS.min,
	maxDistance: CAMERA_RADIUS_LIMITS.max,
	minVerticalAngle: -Math.PI / 2 + 0.1,
	maxVerticalAngle: Math.PI / 2 - 0.1,
};

// ==================== 第三人称相机控制器 ====================

export class ThirdPersonCameraController {
	private scene: Scene;
	private camera: ArcRotateCamera;
	private rendererController: ReturnType<typeof createRendererController>;
	private state: CameraState;
	/** 地形高度采样器：由宿主注入 WorldTerrain.getHeightAt，用于相机-地形碰撞。 */
	private terrainHeightAt?: CameraTerrainHeightSampler;

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
		terrainHeightAt?: CameraTerrainHeightSampler,
	) {
		this.scene = scene;
		this.camera = camera;
		this.rendererController = rendererController;
		this.state = { ...defaultCameraState, ...initialState };
		this.terrainHeightAt = terrainHeightAt;

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

		// 相机-地形约束：碰撞极限由视线方向唯一决定（与当前半径解耦），
		// 恢复只朝 min(命令距离, 碰撞极限) 收敛。若恢复目标是命令距离而碰撞持续，
		// "恢复拉远-碰撞压回"每帧互相打架，会产生可见抖动。
		const collisionLimit = this.computeCollisionLimit();
		this.applyCollisionLimit(collisionLimit);
		if (!this.isTransitioning) {
			this.recoverRadius(deltaTime, collisionLimit);
		}
	}

	/**
	 * 只施加地形碰撞的硬上限，不改变用户命令距离。
	 *
	 * 场景过渡动画由 Babylon 直接写入相机，动画期间不会调用 update；SceneRuntime
	 * 会在相机绘制前调用此入口，因此进入/离开场景也使用同一碰撞约束。
	 */
	constrainCamera(): void {
		this.applyCollisionLimit(this.computeCollisionLimit());
	}

	/**
	 * 用户滚轮 zoom 入口：更新命令距离而非直接改 camera.radius。
	 * 配合 recoverRadius，碰撞压缩后的半径能随 state.distance 恢复，且不与恢复逻辑打架。
	 */
	zoomBy(factor: number): void {
		if (!Number.isFinite(factor) || factor <= 0) return;
		const next = this.state.distance * factor;
		this.state.distance = Math.max(this.state.minDistance, Math.min(this.state.maxDistance, next));
	}

	/** 将 Babylon 已归一化的半径增量写入 desired distance，正值表示拉远。 */
	adjustDistanceBy(delta: number): void {
		if (!Number.isFinite(delta)) return;
		const next = this.state.distance + delta;
		this.state.distance = Math.max(this.state.minDistance, Math.min(this.state.maxDistance, next));
	}

	/**
	 * 把内部 state 应用到真实 ArcRotateCamera。
	 * - target：代码独占维度（鼠标只改 alpha/beta/radius），每帧朝 state.target 平滑插值，产生跟随与初始入场动画。
	 * - setTarget 必须传 cloneAlphaBetaRadius=true：默认 setTarget 会 rebuildAnglesAndRadius（固定相机位置、
	 *   转头看目标），表现为"相机停在原地"；保持球面参数不变时相机位置随 target 平移，才是真正的跟随。
	 * - distance/angle：仅在过渡进行时由代码驱动；过渡结束后交还鼠标控制，避免与用户输入打架。
	 */
	private applyStateToCamera(deltaTime: number): void {
		const lerp = this.state.smoothTransition ? Math.min(1, this.transitionSpeed * deltaTime) : 1;
		const nextTarget = Vector3.Lerp(this.camera.getTarget(), this.state.target, lerp);
		this.camera.setTarget(nextTarget, false, false, true);

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
			this.state.target.copyFromFloats(pose.pos.x, pose.pos.y + PlayerBodyProfile.CAMERA_FOLLOW_EYE_OFFSET, pose.pos.z);
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

	/** 非过渡期把相机半径朝 min(命令距离, 碰撞极限) 平滑插值：碰撞中收敛于极限，解除后逐步回位。 */
	private recoverRadius(deltaTime: number, collisionLimit: number): void {
		if (this.isTransitioning) return;
		const target = Math.min(this.state.distance, collisionLimit);
		const current = this.camera.radius;
		if (Math.abs(current - target) < 0.01) return;
		const next = current + (target - current) * Math.min(1, CAMERA_RADIUS_RECOVERY_SPEED * deltaTime);
		this.camera.radius = next;
	}

	/** 地形碰撞只约束实际半径，不能改写 state.distance 这一用户命令状态。 */
	private applyCollisionLimit(collisionLimit: number): void {
		if (this.camera.radius > collisionLimit) this.camera.radius = collisionLimit;
	}

	/**
	 * 计算本视线方向（alpha/beta/target）下的碰撞极限：沿 target→相机 方向步进采样地面高度，
	 * 视线距地面不足 CAMERA_GROUND_CLEARANCE 处即碰撞点，返回允许的最大视线距离（无碰撞返回 Infinity）。
	 * 检测范围取 max(当前距离, 命令距离)，使极限只由视线方向决定、与当前半径解耦——
	 * 相机停在极限处时每帧结果是确定性的，不会因"恢复拉远-碰撞压回"而振荡。
	 * 选择高度场采样而非 mesh raycast：逻辑地形是纯 heightmap（无洞穴/悬垂），且不依赖
	 * chunk mesh 是否已异步生成。渲染网格是高度场的离散近似，clearance 负责吸收少量表示误差。
	 */
	private computeCollisionLimit(): number {
		if (!this.terrainHeightAt) return Number.POSITIVE_INFINITY;
		// camera.position 在 Babylon 的相机更新阶段才会根据 alpha/beta/radius 重建；
		// 控制器和相机绘制前约束都可能在该阶段之前运行，因此不能读取上一帧位置。
		const sinBeta = Math.sin(this.camera.beta);
		const direction = new Vector3(
			Math.cos(this.camera.alpha) * sinBeta,
			Math.cos(this.camera.beta),
			Math.sin(this.camera.alpha) * sinBeta,
		);
		const target = this.camera.getTarget();
		return computeTerrainCollisionLimit(
			target,
			direction,
			this.camera.radius,
			this.state.distance,
			this.terrainHeightAt,
		);
	}

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
