import { describe, expect, it, vi } from "vitest";
import type { AnimationGroup, Scene } from "~/platform/render/babylon/runtime";
import { CharacterAnimationController } from "./CharacterAnimationController";
import type { CharacterAnimationTarget } from "./entityTypes";

function createAnimation(): AnimationGroup {
	return {
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
}

function createEntity(animations: Record<string, AnimationGroup>): CharacterAnimationTarget {
	// 测试替身只实现动画控制器读取的静态资源与 AnimationGroup 容器。
	return {
		id: "player",
		animationClips: {
			idle: "idle",
			walk: "walk",
			run: "run",
			jump: "jump",
			fall: "fall",
			land: "land",
		},
		locomotionAnimation: {
			walkReferenceSpeed: 1.05,
			runReferenceSpeed: 2.1,
		},
		builtinAnimations: new Map(Object.entries(animations)),
		customAnimations: new Map(),
	} as unknown as CharacterAnimationTarget;
}

describe("CharacterAnimationController", () => {
	it("静止动画保持一倍速", () => {
		const animation = createAnimation();
		const controller = new CharacterAnimationController(createEntity({ idle: animation }), {} as Scene);

		controller.setLocomotion("idle");
		expect(animation.speedRatio).toBe(1);
	});

	it("步行和跑步按实际速度与片段参考速度计算播放倍率", () => {
		const walk = createAnimation();
		const run = createAnimation();
		const controller = new CharacterAnimationController(createEntity({ walk, run }), {} as Scene);

		controller.setMovement(true, 2.25);
		expect(walk.speedRatio).toBeCloseTo(2.25 / 1.05);

		controller.setMovement(true, 4.5);
		expect(run.speedRatio).toBeCloseTo(4.5 / 2.1);
	});

	it("同一移动片段调速时不重置动画相位", () => {
		const run = createAnimation();
		const controller = new CharacterAnimationController(createEntity({ run }), {} as Scene);

		controller.setMovement(true, 4);
		controller.setMovement(true, 4.5);

		expect(run.reset).toHaveBeenCalledOnce();
		expect(run.play).toHaveBeenCalledOnce();
		expect(run.speedRatio).toBeCloseTo(4.5 / 2.1);
	});

	it("固定逻辑时间线由调用方定位", () => {
		const animation = createAnimation();
		const controller = new CharacterAnimationController(createEntity({ idle: animation }), {} as Scene);

		controller.playStateTimeline({ clip: "idle", durationMs: 1000, play: "once" }, 0.25);
		expect(animation.goToFrame).toHaveBeenLastCalledWith(25);
		controller.updateStateTimelineProgress(0.75);
		expect(animation.goToFrame).toHaveBeenLastCalledWith(75);
	});

	it("状态动画按播放策略取模或保持末帧", () => {
		const animation = createAnimation();
		const controller = new CharacterAnimationController(createEntity({ idle: animation }), {} as Scene);

		controller.playStateTimeline({ clip: "idle", durationMs: 1000, play: "loop" }, 1.25);
		expect(animation.goToFrame).toHaveBeenLastCalledWith(25);
		controller.updateStateTimelineProgress(1.75);
		expect(animation.goToFrame).toHaveBeenLastCalledWith(75);
		controller.playStateTimeline({ clip: "idle", durationMs: 1000, play: "hold" }, 1.25);
		expect(animation.goToFrame).toHaveBeenLastCalledWith(100);
	});

	it("状态进度只定位到资源声明的动画片段区间", () => {
		const skillAttack = createAnimation();
		const controller = new CharacterAnimationController(createEntity({ Skill_attack: skillAttack }), {} as Scene);

		controller.playStateTimeline(
			{
				clip: "Skill_attack",
				durationMs: 1150,
				play: "once",
				range: { start: 0, end: 0.5 },
			},
			0.5,
		);
		expect(skillAttack.goToFrame).toHaveBeenLastCalledWith(25);

		controller.playStateTimeline(
			{
				clip: "Skill_attack",
				durationMs: 1150,
				play: "once",
				range: { start: 0.5, end: 1 },
			},
			0.5,
		);
		expect(skillAttack.goToFrame).toHaveBeenLastCalledWith(75);

		controller.playStateTimeline(
			{
				clip: "Skill_attack",
				durationMs: 100,
				play: "hold",
				range: { start: 0.5, end: 0.5 },
			},
			1,
		);
		expect(skillAttack.goToFrame).toHaveBeenLastCalledWith(50);
	});
});
