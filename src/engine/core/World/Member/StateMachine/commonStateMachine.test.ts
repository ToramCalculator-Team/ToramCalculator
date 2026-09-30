import { describe, expect, it } from "vitest";
import { createActor, setup } from "xstate";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";
import { createCommonVerticalState } from "./commonStateMachine";

describe("公共成员垂直状态机", () => {
	it("使用同一份状态图处理跳跃和落地", () => {
		const runtime = {
			grounded: true,
			verticalVelocity: 0,
			locomotion: { jumpSpeed: 7 },
		} as unknown as MemberSharedRuntime;
		const machine = setup({
			types: { context: {} as typeof runtime, events: {} as { type: "跳跃" } | { type: "落地" } },
		}).createMachine({
			context: runtime,
			initial: "vertical",
			states: { vertical: createCommonVerticalState({ runtime }) },
		});
		const actor = createActor(machine).start();

		actor.send({ type: "跳跃" });
		expect(actor.getSnapshot().value).toEqual({ vertical: "腾空" });
		expect(runtime).toMatchObject({ grounded: false, verticalVelocity: 7 });

		actor.send({ type: "落地" });
		expect(actor.getSnapshot().value).toEqual({ vertical: "着地" });
		actor.stop();
	});
});
