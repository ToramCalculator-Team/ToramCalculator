/**
 * 玩家移动步态配置。
 *
 * 这是游戏设计层的共享常量，引擎层（速度计算）和渲染层（动画切换、相机偏移）都以此为基准，
 * 不应分散在输入层、引擎层或渲染层各自维护。
 *
 * 输入层（SceneInputController）输出归一化 intensity（0~1），
 * 引擎层将 intensity 映射到这里的速度值并叠加 buff/debuff，
 * 渲染层用 RUN_ANIMATION_THRESHOLD 把最终速度映射回步态动画。
 */
export const PlayerLocomotionProfile = {
	/** 行走基础速度（m/s），对应 intensity = WALK_INTENSITY (0.5)。 */
	WALK_SPEED: 1.05,
	/** 奔跑基础速度（m/s），对应 intensity = RUN_INTENSITY (1.0)。 */
	RUN_SPEED: 2.1,
	/**
	 * 动画步态切换阈值（m/s）。
	 * 设在走路与奔跑速度的中点，使 debuff 缓慢降速时动画过渡更自然，
	 * 而不是实际速度一低于奔跑速度就立刻切回走路动画。
	 */
	RUN_ANIMATION_THRESHOLD: 1.575,
	/** 起跳瞬间的垂直速度（m/s）。 */
	JUMP_SPEED: 3.4,
	/** 世界重力加速度（m/s²）。 */
	GRAVITY: 9.8,
} as const;

/**
 * 玩家角色体型配置。
 *
 * 渲染层（EntityFactory 模型缩放、ThirdPersonCameraController 跟随偏移）
 * 和未来需要体积判断的系统都以此为基准。
 */
export const PlayerBodyProfile = {
	/** 角色目标身高（m）；EntityFactory 以此缩放 GLB 模型。 */
	HEIGHT: 1.5,
	/**
	 * 相机跟随时目标点相对角色脚底的 Y 偏移（m）。
	 * 通常取身高的约 2/3，让相机对准胸口而非脚底或头顶。
	 */
	CAMERA_FOLLOW_EYE_OFFSET: 1.0,
	/**
	 * 无跟随实体时相机的初始目标 Y 高度（m）。
	 * 与 CAMERA_FOLLOW_EYE_OFFSET 保持一致。
	 */
	CAMERA_IDLE_TARGET_Y: 0.65,
} as const;
