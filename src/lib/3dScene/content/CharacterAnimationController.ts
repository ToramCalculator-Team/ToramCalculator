/**
 * 角色动画控制器（内容编排关注点）。
 *
 * 负责管理角色的内置动画和自定义动画的播放、队列、过渡等。从 RendererController 拆出。
 */

import { AnimationGroup, type Scene } from "~/lib/babylon/runtime";
import { createLogger } from "~/lib/Logger";
import {
	type AnimationPlayRequest,
	BuiltinAnimationType,
	type CharacterEntityRuntime,
	type CustomAnimationData,
} from "./entityTypes";

const logger = createLogger("RenderController");
logger.setLevel(0);

export class CharacterAnimationController {
	private entity: CharacterEntityRuntime;
	private scene: Scene;

	constructor(entity: CharacterEntityRuntime, scene: Scene) {
		this.entity = entity;
		this.scene = scene;
	}

	/** 播放内置动画 */
	playBuiltinAnimation(type: BuiltinAnimationType, options?: Partial<AnimationPlayRequest>): void {
		const animationGroup = this.entity.builtinAnimations.get(type);
		if (!animationGroup) {
			logger.warn(`Character ${this.entity.id}: 内置动画 ${type} 不存在`);
			return;
		}

		this.playAnimation(type, options);
	}

	/** 播放自定义动画 */
	async playCustomAnimation(
		animationData: CustomAnimationData,
		options?: Partial<AnimationPlayRequest>,
	): Promise<void> {
		// 检查是否已缓存
		let animationGroup = this.entity.customAnimations.get(animationData.id);

		if (!animationGroup) {
			// 动态创建自定义动画
			animationGroup = await this.createCustomAnimation(animationData);
			this.entity.customAnimations.set(animationData.id, animationGroup);
		}

		this.playAnimation(animationData.id, options);
	}

	/** 停止所有动画 */
	stopAllAnimations(): void {
		this.entity.builtinAnimations.forEach((group) => {
			group.stop();
		});
		this.entity.customAnimations.forEach((group) => {
			group.stop();
		});
		this.entity.animationState.current = null;
		this.entity.animationState.queue = [];
	}

	/** 获取当前动画状态 */
	getCurrentAnimation(): string | null {
		return this.entity.animationState.current;
	}

	/** 从关键帧数据创建Babylon动画 */
	private async createCustomAnimation(data: CustomAnimationData): Promise<AnimationGroup> {
		// TODO: 实现关键帧数据到Babylon动画的转换
		// 这里预留接口，等确定具体的关键帧数据结构后实现
		logger.info(`创建自定义动画: ${data.name}`, data);

		// 临时实现：创建一个空的动画组
		const animationGroup = new AnimationGroup(data.name, this.scene);

		// 将来这里会根据 data.keyframes 创建具体的动画
		// 例如：位置、旋转、缩放等变换动画
		// const positionAnimation = Animation.CreateAndStartAnimation(...)
		// animationGroup.addTargetedAnimation(positionAnimation, this.entity.mesh)

		return animationGroup;
	}

	/** 播放指定动画 */
	private playAnimation(animationId: string, options?: Partial<AnimationPlayRequest>): void {
		const request: AnimationPlayRequest = {
			animationId,
			mode: "play",
			transitionTime: 0.3,
			speed: 1.0,
			...options,
		};

		switch (request.mode) {
			case "interrupt":
				this.stopAllAnimations();
				this.startAnimation(request);
				break;
			case "queue":
				this.entity.animationState.queue.push(request);
				if (!this.entity.animationState.current) {
					this.processQueue();
				}
				break;
			case "play":
			case "loop":
			default:
				this.startAnimation(request);
				break;
		}
	}

	/** 开始播放动画 */
	private startAnimation(request: AnimationPlayRequest): void {
		// 查找动画组
		const animationGroup =
			this.entity.builtinAnimations.get(request.animationId) || this.entity.customAnimations.get(request.animationId);

		if (!animationGroup) {
			logger.warn(`Character ${this.entity.id}: 动画 ${request.animationId} 不存在`);
			return;
		}

		// 停止当前动画
		if (this.entity.animationState.current) {
			const currentGroup =
				this.entity.builtinAnimations.get(this.entity.animationState.current) ||
				this.entity.customAnimations.get(this.entity.animationState.current);
			currentGroup?.stop();
		}

		// 播放新动画
		animationGroup.play(request.mode === "loop");
		animationGroup.speedRatio = request.speed || 1.0;

		// 更新状态
		this.entity.animationState.previous = this.entity.animationState.current;
		this.entity.animationState.current = request.animationId;

		// 设置完成回调
		if (request.onComplete || this.entity.animationState.queue.length > 0) {
			animationGroup.onAnimationGroupEndObservable.addOnce(() => {
				request.onComplete?.();
				this.entity.animationState.current = null;
				this.processQueue();
			});
		}
	}

	/** 处理动画队列 */
	private processQueue(): void {
		const next = this.entity.animationState.queue.shift();
		if (next) {
			this.startAnimation(next);
		}
	}
}
