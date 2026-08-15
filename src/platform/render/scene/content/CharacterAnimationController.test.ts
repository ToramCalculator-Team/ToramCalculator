import { describe, expect, it, vi } from "vitest";
import type { AnimationGroup, Scene } from "~/platform/render/babylon/runtime";
import { CharacterAnimationController } from "./CharacterAnimationController";
import type { CharacterAnimationTarget } from "./entityTypes";

describe("CharacterAnimationController", () => {
	it("按引擎 mspd 时长倍率的倒数设置 Babylon 播放倍率", () => {
		const animation = {
			from: 0,
			to: 100,
			speedRatio: 1,
			reset: vi.fn(),
			setWeightForAllAnimatables: vi.fn(),
			play: vi.fn(),
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
		controller.setMotionSpeed(50);
		expect(animation.speedRatio).toBe(2);

		controller.setMotionSpeed(1000);
		expect(animation.speedRatio).toBe(2);
	});
});
