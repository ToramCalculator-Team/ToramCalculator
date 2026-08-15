/**
 * 角色动画控制器（内容编排关注点）。
 *
 * 角色的持续移动状态和一次性动作只在这里转换为 Babylon AnimationGroup 播放，
 * 避免命令处理、实体运行时和渲染同步分别维护当前动画。
 */

import { PlayerLocomotionProfile } from "~/game/locomotion";
import { createLogger } from "~/lib/logger";
import { AnimationGroup, type Scene } from "~/platform/render/babylon/runtime";
import type { CharacterAnimationTarget, CustomAnimationData } from "./entityTypes";

const logger = createLogger("RenderController");
logger.setLevel(0);

export type CharacterLocomotionState = "idle" | "walk" | "run";

/** 移动与起跳之间保留一个短的姿态混合，避免按下空格时直接切断当前动作。 */
const ANIMATION_BLENDING_SPEED = 0.08;
/** 落地片段使用较低速度，给角色留出明确的回落过程。 */
const LANDING_SPEED_RATIO = 0.65;

export class CharacterAnimationController {
	private currentAnimationId: string | null = null;
	private locomotionState: CharacterLocomotionState = "idle";
	private activeActionId: string | null = null;
	private actionVersion = 0;
	private airborne = false;

	constructor(
		private readonly entity: CharacterAnimationTarget,
		private readonly scene: Scene,
	) {}

	/** 将引擎移动事实集中投影为角色移动动画状态。 */
	setMovement(moving: boolean, speed: number): void {
		this.setLocomotion(!moving ? "idle" : speed >= PlayerLocomotionProfile.RUN_ANIMATION_THRESHOLD ? "run" : "walk");
	}

	/**
	 * 使用同一提交中的 mspd 调整本地动画播放倍率；该派生值只存在 Babylon 本地。
	 */
	setMotionSpeed(mspd: number): void {
		const actionDurationRatio = Math.max(0.5, 1 - mspd / 100);
		const current = this.getAnimation(this.currentAnimationId ?? "");
		if (current) current.speedRatio = 1 / actionDurationRatio;
	}

	/**
	 * 设置持续移动状态。
	 * 一次性动作播放期间只记录目标状态，动作结束后再恢复，避免移动帧覆盖攻击或跳跃动画。
	 */
	setLocomotion(state: CharacterLocomotionState, progress?: number): void {
		this.locomotionState = state;
		if (this.activeActionId) return;

		const animationId = this.entity.animationClips[state];
		if (this.currentAnimationId === animationId && progress === undefined) return;
		this.startAnimation(animationId, true, progress);
	}

	/** 播放一次性动作，并在结束后恢复最新移动状态。 */
	playAction(animationId: string, progress?: number): void {
		if (!this.getAnimation(animationId)) {
			logger.warn(`Character ${this.entity.id}: 动画 ${animationId} 不存在`);
			return;
		}
		this.startAction(animationId, progress);
	}

	/**
	 * 将引擎的垂直运动事实投影为起跳、滞空和落地动画。
	 * 起跳片段结束后保持终态帧，实际落地时机只由引擎状态决定。
	 */
	setAirborne(airborne: boolean, progress?: number): void {
		if (this.airborne === airborne) return;
		this.airborne = airborne;

		const jumpAnimationId = this.entity.animationClips.jump;
		const landAnimationId = this.entity.animationClips.land;
		if (!this.getAnimation(jumpAnimationId) || !this.getAnimation(landAnimationId)) {
			logger.warn(`Character ${this.entity.id}: 跳跃动画缺少起跳或落地片段`);
			this.activeActionId = null;
			this.currentAnimationId = null;
			this.setLocomotion(this.locomotionState);
			return;
		}

		const actionVersion = ++this.actionVersion;
		const animationId = airborne ? jumpAnimationId : landAnimationId;
		this.activeActionId = animationId;
		this.startAnimation(
			animationId,
			false,
			progress,
			() => {
				if (this.actionVersion !== actionVersion || this.activeActionId !== animationId) return;
				if (this.airborne) {
					const jumpAnimation = this.getAnimation(jumpAnimationId);
					jumpAnimation?.goToFrame(jumpAnimation.to);
					jumpAnimation?.pause();
					return;
				}
				this.activeActionId = null;
				this.currentAnimationId = null;
				this.setLocomotion(this.locomotionState);
			},
			airborne ? 1 : LANDING_SPEED_RATIO,
		);
	}

	/** 创建并播放自定义一次性动作。 */
	async playCustomAction(animationData: CustomAnimationData): Promise<void> {
		let animationGroup = this.entity.customAnimations.get(animationData.id);
		if (!animationGroup) {
			animationGroup = await this.createCustomAnimation(animationData);
			this.entity.customAnimations.set(animationData.id, animationGroup);
		}
		this.startAction(animationData.id);
	}

	/** 停止实体持有的全部动画，并使尚未触发的旧动作回调失效。 */
	stopAllAnimations(): void {
		this.actionVersion++;
		this.airborne = false;
		this.activeActionId = null;
		this.stopAnimationGroups();
		this.currentAnimationId = null;
	}

	getCurrentAnimation(): string | null {
		return this.currentAnimationId;
	}

	private startAction(animationId: string, progress?: number): void {
		const actionVersion = ++this.actionVersion;
		this.activeActionId = animationId;
		this.startAnimation(animationId, false, progress, () => {
			if (this.actionVersion !== actionVersion || this.activeActionId !== animationId) return;
			this.activeActionId = null;
			this.currentAnimationId = null;
			this.restorePersistentAnimation();
		});
	}

	/** 一次性动作结束后，优先恢复引擎仍然成立的滞空姿态，再回到地面步态。 */
	private restorePersistentAnimation(): void {
		if (this.airborne) {
			const jumpAnimationId = this.entity.animationClips.jump;
			const jumpAnimation = this.getAnimation(jumpAnimationId);
			if (jumpAnimation) {
				this.activeActionId = jumpAnimationId;
				this.startAnimation(jumpAnimationId, false);
				jumpAnimation.goToFrame(jumpAnimation.to);
				jumpAnimation.pause();
				return;
			}
		}
		this.activeActionId = null;
		this.setLocomotion(this.locomotionState);
	}

	private startAnimation(
		animationId: string,
		loop: boolean,
		progress?: number,
		onComplete?: () => void,
		speedRatio = 1,
	): void {
		const animationGroup = this.getAnimation(animationId);
		if (!animationGroup) {
			logger.warn(`Character ${this.entity.id}: 动画 ${animationId} 不存在`);
			return;
		}

		this.stopAnimationGroups();
		animationGroup.reset();
		animationGroup.enableBlending = true;
		animationGroup.blendingSpeed = ANIMATION_BLENDING_SPEED;
		animationGroup.speedRatio = speedRatio;
		animationGroup.setWeightForAllAnimatables(1);
		this.currentAnimationId = animationId;
		if (onComplete) animationGroup.onAnimationGroupEndObservable.addOnce(onComplete);
		animationGroup.play(loop);

		if (progress !== undefined && progress >= 0 && progress < 1) {
			animationGroup.goToFrame(animationGroup.from + (animationGroup.to - animationGroup.from) * progress);
		}
	}

	private getAnimation(animationId: string): AnimationGroup | undefined {
		return this.entity.builtinAnimations.get(animationId) ?? this.entity.customAnimations.get(animationId);
	}

	private stopAnimationGroups(): void {
		this.entity.builtinAnimations.forEach((group) => {
			group.stop(true);
		});
		this.entity.customAnimations.forEach((group) => {
			group.stop(true);
		});
	}

	/** 从关键帧数据创建 Babylon 动画；具体关键帧契约确定后在此处实现。 */
	private async createCustomAnimation(data: CustomAnimationData): Promise<AnimationGroup> {
		logger.info(`创建自定义动画: ${data.name}`, data);
		return new AnimationGroup(data.name, this.scene);
	}
}
