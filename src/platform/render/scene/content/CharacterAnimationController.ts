/**
 * 角色动画控制器（内容编排关注点）。
 *
 * 角色的持续移动状态和一次性动作只在这里转换为 Babylon AnimationGroup 播放，
 * 避免命令处理、实体运行时和渲染同步分别维护当前动画。
 */

import { PlayerLocomotionProfile } from "~/game/locomotion";
import { createLogger } from "~/lib/logger";
import { AnimationGroup, type Scene } from "~/platform/render/babylon/runtime";
import type { StatePlayMode } from "../contracts/worldResource";
import type { CharacterAnimationTarget, CustomAnimationData } from "./entityTypes";

const logger = createLogger("RenderController");
logger.setLevel(0);

export type CharacterLocomotionState = "idle" | "walk" | "run";

/** 移动与起跳之间保留一个短的姿态混合，避免按下空格时直接切断当前动作。 */
const ANIMATION_BLENDING_SPEED = 0.08;

export class CharacterAnimationController {
	private currentAnimationId: string | null = null;
	private locomotionState: CharacterLocomotionState = "idle";
	private locomotionSpeedRatio = 1;
	private activeActionId: string | null = null;
	private activeActionPlayMode: StatePlayMode = "once";
	private actionVersion = 0;
	private airborne = false;

	constructor(
		private readonly entity: CharacterAnimationTarget,
		private readonly scene: Scene,
	) {}

	/** 将引擎移动事实集中投影为角色移动动画状态。 */
	setMovement(moving: boolean, speed: number): void {
		if (!moving) {
			this.setLocomotion("idle", undefined, 1);
			return;
		}
		const state = speed >= PlayerLocomotionProfile.RUN_ANIMATION_THRESHOLD ? "run" : "walk";
		const referenceSpeed =
			state === "run"
				? this.entity.locomotionAnimation.runReferenceSpeed
				: this.entity.locomotionAnimation.walkReferenceSpeed;
		this.setLocomotion(state, undefined, Math.max(0, speed) / referenceSpeed);
	}

	/**
	 * 设置持续移动状态。
	 * 一次性动作播放期间只记录目标状态，动作结束后再恢复，避免移动帧覆盖攻击或跳跃动画。
	 */
	setLocomotion(state: CharacterLocomotionState, progress?: number, speedRatio = 1): void {
		this.locomotionState = state;
		this.locomotionSpeedRatio = speedRatio;
		if (this.activeActionId) return;

		const animationId = this.entity.animationClips[state];
		if (this.currentAnimationId === animationId && progress === undefined) {
			const animation = this.getAnimation(animationId);
			if (animation) animation.speedRatio = speedRatio;
			return;
		}
		this.startAnimation(animationId, true, progress, undefined, speedRatio);
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
	 * 启动由 SAB 状态描述的逻辑动画。Babylon 不负责推进这类动画，
	 * 每次同步都由 updateStateTimelineProgress 定位到逻辑时间对应的帧。
	 */
	playTimeline(animationId: string, progress: number): void {
		this.playStateTimeline(animationId, progress, "once");
	}

	/** 按静态资源里的播放策略启动状态动画。 */
	playStateTimeline(animationId: string, progress: number, playMode: StatePlayMode): void {
		if (!this.getAnimation(animationId)) {
			logger.warn(`Character ${this.entity.id}: 动画 ${animationId} 不存在`);
			return;
		}
		this.actionVersion++;
		this.activeActionId = animationId;
		this.activeActionPlayMode = playMode;
		this.startAnimation(animationId, false, this.normalizeProgress(progress, playMode), undefined, 1, true);
	}

	/** 更新当前状态动画的帧位置；动画生命周期由逻辑状态切换或清除。 */
	updateTimelineProgress(progress: number): void {
		this.updateStateTimelineProgress(progress);
	}

	/** 按当前播放策略更新帧位置；loop 策略按片段长度取模。 */
	updateStateTimelineProgress(progress: number): void {
		if (!this.activeActionId) return;
		const animation = this.getAnimation(this.activeActionId);
		if (!animation) return;
		animation.goToFrame(
			animation.from + (animation.to - animation.from) * this.normalizeProgress(progress, this.activeActionPlayMode),
		);
		animation.pause();
	}

	/**
	 * 将引擎的垂直运动事实投影为起跳、滞空和落地动画。
	 * 起跳片段结束后保持终态帧，实际落地时机只由引擎状态决定。
	 */
	setAirborne(airborne: boolean, progress?: number): void {
		if (this.airborne === airborne) return;
		this.airborne = airborne;
		// 技能时间线由逻辑引擎控制，移动状态变化只记录到本地事实，不能覆盖当前技能动作。
		if (this.activeActionId) return;

		const jumpAnimationId = this.entity.animationClips.jump;
		const landAnimationId = this.entity.animationClips.land;
		if (!this.getAnimation(jumpAnimationId) || !this.getAnimation(landAnimationId)) {
			logger.warn(`Character ${this.entity.id}: 跳跃动画缺少起跳或落地片段`);
			this.activeActionId = null;
			this.currentAnimationId = null;
			this.setLocomotion(this.locomotionState, undefined, this.locomotionSpeedRatio);
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
				this.setLocomotion(this.locomotionState, undefined, this.locomotionSpeedRatio);
			},
			1,
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
		this.activeActionPlayMode = "once";
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
		this.setLocomotion(this.locomotionState, undefined, this.locomotionSpeedRatio);
	}

	private normalizeProgress(progress: number, playMode: StatePlayMode): number {
		if (playMode === "loop") {
			return ((progress % 1) + 1) % 1;
		}
		return Math.min(1, Math.max(0, progress));
	}

	private startAnimation(
		animationId: string,
		loop: boolean,
		progress?: number,
		onComplete?: () => void,
		speedRatio = 1,
		manualProgress = false,
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

		if (progress !== undefined) {
			const clamped = Math.min(1, Math.max(0, progress));
			animationGroup.goToFrame(animationGroup.from + (animationGroup.to - animationGroup.from) * clamped);
			if (manualProgress) animationGroup.pause();
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
