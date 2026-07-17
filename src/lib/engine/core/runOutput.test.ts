import { describe, expect, it } from "vitest";
import { EngineRunOutputSchema, RunOutputRecorder } from "./runOutput";
import { readTickStateRange } from "./tickStateHistory";

describe("RunOutputRecorder", () => {
	it("逐 Tick 连续记录，并按同一 runId 幂等封闭", () => {
		const recorder = new RunOutputRecorder();
		recorder.start("run-1", 0, 0, { tickStateHistory: "everyTick" });
		expect(() => recorder.assertScenarioChangeAllowed()).toThrow("仍在记录");
		recorder.appendTick(0, 100, []);
		recorder.appendTick(1, 200, []);
		recorder.appendTick(2, 300, []);

		const output = recorder.finish("run-1", 300);
		expect(() => recorder.assertScenarioChangeAllowed()).toThrow("产出尚未确认");
		expect(output).toEqual(
			expect.objectContaining({
				runId: "run-1",
				durationMs: 300,
			}),
		);
		const stateHistory = output.stateHistory;
		expect(stateHistory?.tickCount).toBe(3);
		if (!stateHistory) throw new Error("逐 Tick 记录缺少状态历史");
		expect(readTickStateRange(stateHistory, 0, 3).map((item) => item.tickIndex)).toEqual([0, 1, 2]);
		expect(recorder.finish("run-1", 9900)).toBe(output);
		expect(() => recorder.start("run-2", 0, 0, { tickStateHistory: "none" })).toThrow("尚未移交");

		recorder.acknowledgeTransfer("run-1");
		expect(() => recorder.assertScenarioChangeAllowed()).not.toThrow();
		expect(() => recorder.acknowledgeTransfer("run-1")).not.toThrow();
		recorder.start("run-2", 0, 0, { tickStateHistory: "none" });
	});

	it("从非零引擎时刻启动时，把帧定位和运行事实分别归一化为相对 Tick 与模拟时间", () => {
		const recorder = new RunOutputRecorder();
		recorder.start("branch-action", 12, 1200, { tickStateHistory: "everyTick" });
		recorder.appendTick(12, 1300, []);
		recorder.appendTick(13, 1400, []);
		recorder.appendInput({
			inputId: "input-1",
			memberId: "member-1",
			timeMs: 1300,
			action: { type: "使用技能", payload: { skillId: "skill-1" } },
		});
		recorder.acceptInput("input-1", 1400);
		recorder.appendSkillRelease({ memberId: "member-1", skillId: "skill-1", timeMs: 1400 });
		recorder.appendDamage({
			sourceMemberId: "member-1",
			targetMemberId: "target-1",
			sourceSkillId: "skill-1",
			damage: 1,
			timeMs: 1400,
		});

		const output = recorder.finish("branch-action", 1500);
		expect(output.durationMs).toBe(300);
		if (!output.stateHistory) throw new Error("逐 Tick 记录缺少状态历史");
		const ticks = readTickStateRange(output.stateHistory, 0, 2);
		expect(ticks.map((item) => item.tickIndex)).toEqual([0, 1]);
		expect(ticks.map((item) => item.currentTimeMs)).toEqual([100, 200]);
		expect(output.inputs[0]?.timeMs).toBe(200);
		expect(output.skillReleases[0]?.timeMs).toBe(200);
		expect(output.damage[0]?.timeMs).toBe(200);
	});

	it("拒绝不连续 Tick，并保留唯一输入轨迹", () => {
		const recorder = new RunOutputRecorder();
		recorder.start("run-1", 0, 0, { tickStateHistory: "everyTick" });
		expect(() => recorder.appendTick(1, 100, [])).toThrow("不连续");
		recorder.appendInput({
			inputId: "input-1",
			memberId: "member-1",
			timeMs: 200,
			action: { type: "使用技能", payload: { skillId: "skill-1" } },
		});
		expect(recorder.hasPendingInput("input-1")).toBe(true);
		recorder.appendInput({
			inputId: "input-2",
			memberId: "member-1",
			timeMs: 300,
			action: { type: "使用技能", payload: { skillId: "skill-1" } },
		});
		recorder.acceptInput("input-1", 400);
		expect(recorder.hasPendingInput("input-1")).toBe(false);
		expect(recorder.hasPendingInput("missing")).toBe(false);
		recorder.rejectInput("input-2", 500, "冷却中");

		const output = recorder.finish("run-1", 600);
		expect(output.inputs.map((input) => input.status)).toEqual(["accepted", "rejected"]);
		expect("acceptedActions" in output).toBe(false);
	});

	it("封闭时把未决输入转为明确拒绝，公开 Schema 不接受 pending", () => {
		const recorder = new RunOutputRecorder();
		recorder.start("run-1", 0, 0, { tickStateHistory: "none" });
		recorder.appendInput({
			inputId: "input-1",
			memberId: null,
			timeMs: 0,
			action: { type: "移动", payload: { position: { x: 1, y: 2 } } },
		});
		const output = recorder.finish("run-1", 100);
		expect(output.stateHistory).toBeNull();
		expect(output.inputs).toEqual([expect.objectContaining({ status: "rejected", reason: "运行结束前未被成员接纳" })]);
		expect(() =>
			EngineRunOutputSchema.parse({
				...output,
				inputs: [{ ...output.inputs[0], status: "pending", reason: undefined }],
			}),
		).toThrow();
	});

	it("重复或未知回执直接失败，接纳输入必须有成员身份", () => {
		const recorder = new RunOutputRecorder();
		recorder.start("run-1", 0, 0, { tickStateHistory: "none" });
		expect(() => recorder.acceptInput("missing", 0)).toThrow("未知 inputId");
		recorder.appendInput({
			inputId: "input-1",
			memberId: null,
			timeMs: 0,
			action: { type: "移动", payload: { position: { x: 1, y: 2 } } },
		});
		expect(() => recorder.acceptInput("input-1", 0)).toThrow("缺少 memberId");
		recorder.rejectInput("input-1", 0, "未绑定成员");
		expect(() => recorder.rejectInput("input-1", 0, "重复回执")).toThrow("已有最终决议");
	});

	it("技能接纳沿用原请求语义，公开 Schema 拒绝 targetId 和开放 payload", () => {
		const recorder = new RunOutputRecorder();
		recorder.start("run-1", 0, 0, { tickStateHistory: "none" });
		recorder.appendInput({
			inputId: "skill-input",
			memberId: "member-1",
			timeMs: 0,
			action: { type: "使用技能", payload: { skillId: "skill-1" } },
		});
		recorder.acceptInput("skill-input", 0);
		const output = recorder.finish("run-1", 100);
		expect(output.inputs[0]?.action).toEqual({
			type: "使用技能",
			payload: { skillId: "skill-1" },
		});
		expect(() =>
			EngineRunOutputSchema.parse({
				...output,
				inputs: [
					{
						...output.inputs[0],
						action: { type: "使用技能", payload: { skillId: "skill-1", targetId: "target-1" } },
					},
				],
			}),
		).toThrow();
	});
});
