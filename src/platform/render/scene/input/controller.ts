import type { HorizontalVector, MovementStateSink } from "~/engine/controller/controllerInput";
import type { ControllerActionEvent } from "./controllerTypes";

export interface ControllerCameraBasis {
	/** 相机朝向在水平面上的单位向量。 */
	forward: HorizontalVector;
	/** 相机右侧在水平面上的单位向量。 */
	right: HorizontalVector;
}

export interface SceneInputControllerOptions {
	eventTarget?: Window;
	getCameraBasis: () => ControllerCameraBasis;
	movementSink: MovementStateSink;
	onAction: (action: ControllerActionEvent) => void;
	/** 以 KeyboardEvent.code 为键，值为下游识别的技能 ID。 */
	skillBindings?: Readonly<Record<string, string>>;
}

const MOVEMENT_KEYS = new Set(["KeyW", "ArrowUp", "KeyA", "ArrowLeft", "KeyS", "ArrowDown", "KeyD", "ArrowRight"]);
const RUN_KEYS = new Set(["ShiftLeft", "ShiftRight"]);
const JUMP_KEY = "Space";
const WALK_INTENSITY = 0.5;
const RUN_INTENSITY = 1;
const NORMALIZATION_EPSILON = 0.0001;

const isEditableTarget = (target: EventTarget | null): boolean => {
	if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
	return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

const normalizeHorizontal = (vector: HorizontalVector): HorizontalVector | null => {
	const length = Math.hypot(vector.x, vector.z);
	if (!Number.isFinite(length) || length <= NORMALIZATION_EPSILON) return null;
	return { x: vector.x / length, z: vector.z / length };
};

/**
 * 将键盘持续状态与当前相机基准解析为世界水平移动状态。
 *
 * 移动使用 SAB latest-wins 通道；调用方在场景帧调用 updateMovementState，消费者在每个 Tick
 * 读取一次最新完整状态。跳跃、技能等不可丢失动作继续通过 onAction 逐次输出。
 */
export class SceneInputController {
	private readonly eventTarget: Window;
	private readonly getCameraBasis: () => ControllerCameraBasis;
	private readonly onAction: (action: ControllerActionEvent) => void;
	private readonly skillBindings: Readonly<Record<string, string>>;
	private readonly pressedKeys = new Set<string>();
	private readonly movementSink: MovementStateSink;
	private disposed = false;

	constructor(options: SceneInputControllerOptions) {
		this.eventTarget = options.eventTarget ?? window;
		this.getCameraBasis = options.getCameraBasis;
		this.movementSink = options.movementSink;
		this.onAction = options.onAction;
		this.skillBindings = options.skillBindings ?? {};

		this.eventTarget.addEventListener("keydown", this.handleKeyDown);
		this.eventTarget.addEventListener("keyup", this.handleKeyUp);
		this.eventTarget.addEventListener("blur", this.handleBlur);
	}

	/** 场景帧调用：根据当前按键与相机基准覆盖发布最新移动状态。 */
	updateMovementState(): void {
		if (this.disposed) return;
		const localX =
			(this.pressedKeys.has("KeyD") || this.pressedKeys.has("ArrowRight") ? 1 : 0) +
			(this.pressedKeys.has("KeyA") || this.pressedKeys.has("ArrowLeft") ? -1 : 0);
		const localZ =
			(this.pressedKeys.has("KeyW") || this.pressedKeys.has("ArrowUp") ? 1 : 0) +
			(this.pressedKeys.has("KeyS") || this.pressedKeys.has("ArrowDown") ? -1 : 0);

		if (localX === 0 && localZ === 0) {
			this.writeStoppedState(true);
			return;
		}

		const basis = this.getCameraBasis();
		const forward = normalizeHorizontal(basis.forward);
		const right = normalizeHorizontal(basis.right);
		if (forward === null || right === null) {
			this.writeStoppedState(true);
			return;
		}

		const direction = normalizeHorizontal({
			x: right.x * localX + forward.x * localZ,
			z: right.z * localX + forward.z * localZ,
		});
		if (direction === null) {
			this.writeStoppedState(true);
			return;
		}
		const running = this.pressedKeys.has("ShiftLeft") || this.pressedKeys.has("ShiftRight");
		const intensity = running ? RUN_INTENSITY : WALK_INTENSITY;
		this.movementSink.write({ enabled: true, moving: true, direction, intensity });
	}

	/** 返回当前已按下的键，便于测试页或调试工具显示输入状态。 */
	getPressedKeys(): readonly string[] {
		return [...this.pressedKeys];
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.eventTarget.removeEventListener("keydown", this.handleKeyDown);
		this.eventTarget.removeEventListener("keyup", this.handleKeyUp);
		this.eventTarget.removeEventListener("blur", this.handleBlur);
		this.pressedKeys.clear();
		this.writeStoppedState(false);
	}

	private readonly handleKeyDown = (event: KeyboardEvent): void => {
		if (this.disposed || isEditableTarget(event.target) || event.repeat) return;

		if (event.code === JUMP_KEY) {
			event.preventDefault();
			this.emitJumpAction();
			return;
		}

		const skillId = this.skillBindings[event.code];
		if (skillId !== undefined) {
			event.preventDefault();
			this.emitSkillAction(skillId);
			return;
		}

		if (RUN_KEYS.has(event.code)) {
			if (this.pressedKeys.has(event.code)) return;
			event.preventDefault();
			this.pressedKeys.add(event.code);
			this.updateMovementState();
			return;
		}

		if (!MOVEMENT_KEYS.has(event.code) || this.pressedKeys.has(event.code)) return;
		event.preventDefault();
		this.pressedKeys.add(event.code);
		this.updateMovementState();
	};

	private readonly handleKeyUp = (event: KeyboardEvent): void => {
		if (this.disposed || (!MOVEMENT_KEYS.has(event.code) && !RUN_KEYS.has(event.code))) return;
		if (!this.pressedKeys.delete(event.code)) return;
		event.preventDefault();
		this.updateMovementState();
	};

	private readonly handleBlur = (): void => {
		if (this.disposed || this.pressedKeys.size === 0) return;
		this.pressedKeys.clear();
		this.updateMovementState();
	};

	private writeStoppedState(enabled: boolean): void {
		this.movementSink.write({ enabled, moving: false, direction: { x: 0, z: 0 }, intensity: 0 });
	}

	private emitSkillAction(skillId: string): void {
		this.onAction({
			type: "skill_triggered",
			skillId,
		});
	}

	private emitJumpAction(): void {
		this.onAction({
			type: "jump_triggered",
		});
	}
}
