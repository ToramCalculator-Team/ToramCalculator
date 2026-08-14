import { afterEach, describe, expect, it, vi } from "vitest";
import { readSharedMovementState, SharedMovementStateWriter } from "~/engine/core/thread/controllerInputBuffer";
import { SceneInputController } from "./controller";
import type { ControllerActionEvent } from "./controllerTypes";

function dispatchKeyboardEvent(target: EventTarget, type: "keydown" | "keyup", code: string, repeat = false): Event {
	const event = new Event(type, { cancelable: true });
	Object.defineProperties(event, {
		code: { value: code },
		repeat: { value: repeat },
	});
	target.dispatchEvent(event);
	return event;
}

function readMovement(writer: SharedMovementStateWriter) {
	const state = readSharedMovementState(writer.buffer);
	if (!state) throw new Error("未读取到稳定的移动状态");
	return state;
}

function createController(skillBindings?: Readonly<Record<string, string>>) {
	const eventTarget = new EventTarget();
	const actions: ControllerActionEvent[] = [];
		const writer = new SharedMovementStateWriter();
		vi.stubGlobal("window", eventTarget);
		const controller = new SceneInputController({
			movementSink: writer,
		getCameraBasis: () => ({
			forward: { x: 0, z: 1 },
			right: { x: 1, z: 0 },
		}),
		onAction: (action) => actions.push(action),
		skillBindings,
	});
	return { actions, controller, eventTarget, writer };
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("SceneInputController", () => {
	it("方向键步行，Shift 按下和释放时在奔跑与步行之间切换", () => {
		const { controller, eventTarget, writer } = createController();

		dispatchKeyboardEvent(eventTarget, "keydown", "ArrowUp");
		expect(readMovement(writer)).toMatchObject({
			moving: true,
			direction: { x: 0, z: 1 },
			intensity: 0.5,
		});

		dispatchKeyboardEvent(eventTarget, "keydown", "ShiftLeft");
		expect(readMovement(writer)).toMatchObject({ moving: true, intensity: 1 });

		dispatchKeyboardEvent(eventTarget, "keyup", "ShiftLeft");
		expect(readMovement(writer)).toMatchObject({ moving: true, intensity: 0.5 });

		dispatchKeyboardEvent(eventTarget, "keyup", "ArrowUp");
		expect(readMovement(writer)).toMatchObject({ moving: false, intensity: 0 });
		controller.dispose();
	});

	it("先按 Shift 再按方向键时直接进入奔跑", () => {
		const { controller, eventTarget, writer } = createController();

		dispatchKeyboardEvent(eventTarget, "keydown", "ShiftRight");
		expect(readMovement(writer)).toMatchObject({ moving: false, intensity: 0 });

		dispatchKeyboardEvent(eventTarget, "keydown", "KeyW");
		expect(readMovement(writer)).toMatchObject({ moving: true, intensity: 1 });
		controller.dispose();
	});

	it("Space 只触发一次跳跃动作，Digit1 继续触发技能动作", () => {
		const { actions, controller, eventTarget } = createController({ Digit1: "basic_attack" });

		dispatchKeyboardEvent(eventTarget, "keydown", "Space");
		dispatchKeyboardEvent(eventTarget, "keydown", "Space", true);
		dispatchKeyboardEvent(eventTarget, "keydown", "Digit1");

		expect(actions).toEqual([
			{ type: "jump_triggered" },
			{ type: "skill_triggered", skillId: "basic_attack" },
		]);
		controller.dispose();
	});
});
