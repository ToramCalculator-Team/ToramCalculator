import { describe, expect, it, vi } from "vitest";
import type { AnimationGroup, Scene } from "~/platform/render/babylon/runtime";
import { CharacterAnimationController } from "./CharacterAnimationController";
import type { CharacterAnimationTarget } from "./entityTypes";

describe("CharacterAnimationController", () => {
	it("普通移动动画按动画片段自身的固定速率播放", () => {
		const animation = {
			from: 0,
			to: 100,
			speedRatio: 1,
			reset: vi.fn(),
			setWeightForAllAnimatables: vi.fn(),
			play: vi.fn(),
			pause: vi.fn(),
			goToFrame: vi.fn(),
			stop: vi.fn(),
			onAnimationGroupEndObservable: { addOnce: vi.fn() },
		} as unknown as AnimationGroup;
		const entity = {
			id: "player",
			animationClips: { idle: "idle" },
			builtinAnimations: new Map([["idle", animation]]),
			customAnimations: new Map(),
		} as unknown as CharacterAnimationTarget;
		const controller = new CharacterAnimationController(entity, {} as Scene);

		controller.setLocomotion("idle");
		expect(animation.speedRatio).toBe(1);
	});

	it("固定逻辑时间线由调用方定位", () => {
		const animation = {
			from: 0,
			to: 100,
			speedRatio: 1,
			reset: vi.fn(),
			setWeightForAllAnimatables: vi.fn(),
			play: vi.fn(),
			pause: vi.fn(),
			goToFrame: vi.fn(),
			stop: vi.fn(),
			onAnimationGroupEndObservable: { addOnce: vi.fn() },
		} as unknown as AnimationGroup;
		const entity = {
			id: "player",
			animationClips: { idle: "idle" },
			builtinAnimations: new Map([["idle", animation]]),
			customAnimations: new Map(),
		} as unknown as CharacterAnimationTarget;
		const controller = new CharacterAnimationController(entity, {} as Scene);

		controller.playTimeline("idle", 0.25);
		expect(animation.goToFrame).toHaveBeenLastCalledWith(25);
		controller.updateTimelineProgress(0.75);
		expect(animation.goToFrame).toHaveBeenLastCalledWith(75);
	});

	it("状态动画按播放策略取模或保持末帧", () => {
		const animation = {
			from: 0,
			to: 100,
			speedRatio: 1,
			reset: vi.fn(),
			setWeightForAllAnimatables: vi.fn(),
			play: vi.fn(),
			pause: vi.fn(),
			goToFrame: vi.fn(),
			stop: vi.fn(),
			onAnimationGroupEndObservable: { addOnce: vi.fn() },
		} as unknown as AnimationGroup;
		const entity = {
			id: "player",
			animationClips: { idle: "idle" },
			builtinAnimations: new Map([["idle", animation]]),
			customAnimations: new Map(),
		} as unknown as CharacterAnimationTarget;
		const controller = new CharacterAnimationController(entity, {} as Scene);

		controller.playStateTimeline("idle", 1.25, "loop");
		expect(animation.goToFrame).toHaveBeenLastCalledWith(25);
		controller.updateStateTimelineProgress(1.75);
		expect(animation.goToFrame).toHaveBeenLastCalledWith(75);
		controller.playStateTimeline("idle", 1.25, "hold");
		expect(animation.goToFrame).toHaveBeenLastCalledWith(100);
	});
});
