/**
 * 单相机过渡动画（相机/注意力关注点）。
 *
 * 从 SceneRuntimeCore 抽出：全程唯一 ArcRotateCamera 在观察位 / 跟随位 / 槽位特写之间的补间。
 * 纯执行工具——接收 scene/camera 句柄，读应用级动画开关，用 babylon Animation 补间，不持有场景状态。
 * 见 docs/decisions/0012-intent-first-visual-control.md（focusCamera/resetCamera 作为意图层场景投影）
 */

import type { ArcRotateCamera, Scene } from "~/lib/babylon/runtime";
import { Animation, CubicEase, EasingFunction, Vector3 } from "~/lib/babylon/runtime";
import { store } from "~/store";

/** 观察位（背景相机初始姿态），过渡动画的"离开终点 / 进入起点"。 */
export const OBSERVE_POSE = { alpha: 1.58, beta: 1.6, radius: 3.12, target: new Vector3(0, 0.43, 0) };

/** 进入跟随位的固定角度/距离（与 ThirdPersonCameraController 默认一致）。 */
export const FOLLOW_POSE = { alpha: Math.PI / 2, beta: Math.PI / 3, radius: 8 };

export type CameraDest = { alpha: number; beta: number; radius: number; target: Vector3 };

/** 把相机的 alpha/beta/radius/target 用 CubicEase 补间到目标姿态，完成调用 onDone，返回取消函数。 */
export const animateCameraTo = (
	scene: Scene | undefined,
	camera: ArcRotateCamera | undefined,
	dest: CameraDest,
	onDone: () => void,
): (() => void) => {
	if (!scene || !camera) {
		onDone();
		return () => {};
	}
	const animationsEnabled = store.settings.userInterface.isAnimationEnabled;
	const durationMs = animationsEnabled ? 700 : 0;
	if (durationMs === 0) {
		camera.alpha = dest.alpha;
		camera.beta = dest.beta;
		camera.radius = dest.radius;
		camera.setTarget(dest.target.clone());
		onDone();
		return () => {};
	}
	const fps = 60;
	const frames = Math.round((durationMs / 1000) * fps);
	const ease = new CubicEase();
	ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

	const makeScalarAnim = (prop: "alpha" | "beta" | "radius", from: number, to: number) => {
		const anim = new Animation(`cam-${prop}`, prop, fps, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
		anim.setKeys([
			{ frame: 0, value: from },
			{ frame: frames, value: to },
		]);
		anim.setEasingFunction(ease);
		return anim;
	};
	const targetAnim = new Animation("cam-target", "target", fps, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT);
	targetAnim.setKeys([
		{ frame: 0, value: camera.getTarget().clone() },
		{ frame: frames, value: dest.target.clone() },
	]);
	targetAnim.setEasingFunction(ease);

	camera.animations = [
		makeScalarAnim("alpha", camera.alpha, dest.alpha),
		makeScalarAnim("beta", camera.beta, dest.beta),
		makeScalarAnim("radius", camera.radius, dest.radius),
		targetAnim,
	];
	const animatable = scene.beginAnimation(camera, 0, frames, false, 1, () => onDone());
	return () => {
		animatable.stop();
	};
};
