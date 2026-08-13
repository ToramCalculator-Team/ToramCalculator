import type {
	ControllerActionEvent,
	ControllerInputSource,
	HorizontalVector,
	SharedMovementStateSnapshot,
} from "./controllerTypes";

export interface ControllerCameraBasis {
	/** 相机朝向在水平面上的单位向量。 */
	forward: HorizontalVector;
	/** 相机右侧在水平面上的单位向量。 */
	right: HorizontalVector;
}

export interface SceneInputControllerOptions {
	controllerId: string;
	source?: ControllerInputSource;
	eventTarget?: Window;
	getCameraBasis: () => ControllerCameraBasis;
	onAction: (action: ControllerActionEvent) => void;
	/** 以 KeyboardEvent.code 为键，值为下游识别的技能 ID。 */
	skillBindings?: Readonly<Record<string, string>>;
}

export const SHARED_MOVEMENT_STATE_LAYOUT_VERSION = 1;

const MOVEMENT_KEYS = new Set(["KeyW", "ArrowUp", "KeyA", "ArrowLeft", "KeyS", "ArrowDown", "KeyD", "ArrowRight"]);
const NORMALIZATION_EPSILON = 0.0001;
const HEADER_LENGTH = 4;
const VALUE_LENGTH = 4;
const HEADER_REVISION = 0;
const HEADER_LAYOUT_VERSION = 1;
const HEADER_FLAGS = 2;
const FLAG_ENABLED = 1 << 0;
const FLAG_MOVING = 1 << 1;
const VALUE_DIRECTION_X = 0;
const VALUE_DIRECTION_Z = 1;
const VALUE_INTENSITY = 2;
const HEADER_BYTES = Int32Array.BYTES_PER_ELEMENT * HEADER_LENGTH;
const SHARED_MOVEMENT_STATE_BYTES = HEADER_BYTES + Float32Array.BYTES_PER_ELEMENT * VALUE_LENGTH;
const MAX_READ_ATTEMPTS = 4;

interface WritableMovementState {
	enabled: boolean;
	moving: boolean;
	direction: HorizontalVector;
	intensity: number;
}

const isEditableTarget = (target: EventTarget | null): boolean => {
	if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
	return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

const normalizeHorizontal = (vector: HorizontalVector): HorizontalVector | null => {
	const length = Math.hypot(vector.x, vector.z);
	if (!Number.isFinite(length) || length <= NORMALIZATION_EPSILON) return null;
	return { x: vector.x / length, z: vector.z / length };
};

const storedMovementState = (state: WritableMovementState): WritableMovementState => ({
	enabled: state.enabled,
	moving: state.moving,
	direction: {
		x: Math.fround(state.direction.x),
		z: Math.fround(state.direction.z),
	},
	intensity: Math.fround(state.intensity),
});

const areMovementStatesEqual = (left: WritableMovementState, right: WritableMovementState): boolean =>
	left.enabled === right.enabled &&
	left.moving === right.moving &&
	left.direction.x === right.direction.x &&
	left.direction.z === right.direction.z &&
	left.intensity === right.intensity;

/**
 * 非阻塞读取一份完整移动状态。
 *
 * 写入者发布中的 revision 为奇数；读取前后版本不一致时重试。有限次重试仍不稳定则返回 null，
 * 让本 Tick 保留上一次已消费状态，避免实时循环等待主线程写入完成。
 */
export function readSharedMovementState(buffer: SharedArrayBuffer): SharedMovementStateSnapshot | null {
	if (buffer.byteLength < SHARED_MOVEMENT_STATE_BYTES) {
		throw new Error(`移动状态 SAB 长度不足: ${buffer.byteLength}`);
	}
	const header = new Int32Array(buffer, 0, HEADER_LENGTH);
	const values = new Float32Array(buffer, HEADER_BYTES, VALUE_LENGTH);
	const layoutVersion = Atomics.load(header, HEADER_LAYOUT_VERSION);
	if (layoutVersion !== SHARED_MOVEMENT_STATE_LAYOUT_VERSION) {
		throw new Error(`不支持的移动状态 SAB 布局版本: ${layoutVersion}`);
	}

	for (let attempt = 0; attempt < MAX_READ_ATTEMPTS; attempt += 1) {
		const revisionBefore = Atomics.load(header, HEADER_REVISION);
		if ((revisionBefore & 1) !== 0) continue;
		const flags = Atomics.load(header, HEADER_FLAGS);
		const directionX = values[VALUE_DIRECTION_X] ?? 0;
		const directionZ = values[VALUE_DIRECTION_Z] ?? 0;
		const intensity = values[VALUE_INTENSITY] ?? 0;
		const revisionAfter = Atomics.load(header, HEADER_REVISION);
		if (revisionBefore !== revisionAfter || (revisionAfter & 1) !== 0) continue;

		return {
			layoutVersion,
			revision: revisionAfter,
			enabled: (flags & FLAG_ENABLED) !== 0,
			moving: (flags & FLAG_MOVING) !== 0,
			direction: { x: directionX, z: directionZ },
			intensity,
		};
	}
	return null;
}

/** 单写者 SAB 写入器；每次发布只覆盖一份最新移动状态，不维护历史或队列。 */
class SharedMovementStateWriter {
	readonly buffer: SharedArrayBuffer;
	private readonly header: Int32Array;
	private readonly values: Float32Array;
	private currentState: WritableMovementState | null = null;

	constructor() {
		if (typeof SharedArrayBuffer === "undefined" || typeof Atomics === "undefined") {
			throw new Error("当前环境不支持 SharedArrayBuffer 或 Atomics");
		}
		this.buffer = new SharedArrayBuffer(SHARED_MOVEMENT_STATE_BYTES);
		this.header = new Int32Array(this.buffer, 0, HEADER_LENGTH);
		this.values = new Float32Array(this.buffer, HEADER_BYTES, VALUE_LENGTH);
		Atomics.store(this.header, HEADER_LAYOUT_VERSION, SHARED_MOVEMENT_STATE_LAYOUT_VERSION);
		this.write({ enabled: true, moving: false, direction: { x: 0, z: 0 }, intensity: 0 });
	}

	write(nextState: WritableMovementState): boolean {
		const nextStoredState = storedMovementState(nextState);
		if (this.currentState !== null && areMovementStatesEqual(this.currentState, nextStoredState)) return false;

		const writingRevision = Atomics.add(this.header, HEADER_REVISION, 1) + 1;
		Atomics.store(
			this.header,
			HEADER_FLAGS,
			(nextStoredState.enabled ? FLAG_ENABLED : 0) | (nextStoredState.moving ? FLAG_MOVING : 0),
		);
		this.values[VALUE_DIRECTION_X] = nextStoredState.direction.x;
		this.values[VALUE_DIRECTION_Z] = nextStoredState.direction.z;
		this.values[VALUE_INTENSITY] = nextStoredState.intensity;
		Atomics.store(this.header, HEADER_REVISION, writingRevision + 1);
		this.currentState = nextStoredState;
		return true;
	}
}

/**
 * 将键盘持续状态与当前相机基准解析为世界水平移动状态。
 *
 * 移动使用 SAB latest-wins 通道；调用方在场景帧调用 updateMovementState，消费者在每个 Tick
 * 读取一次最新完整状态。技能等不可丢失动作继续通过 onAction 逐次输出。
 */
export class SceneInputController {
	private readonly controllerId: string;
	private readonly source: ControllerInputSource;
	private readonly eventTarget: Window;
	private readonly getCameraBasis: () => ControllerCameraBasis;
	private readonly onAction: (action: ControllerActionEvent) => void;
	private readonly skillBindings: Readonly<Record<string, string>>;
	private readonly pressedKeys = new Set<string>();
	private readonly movementWriter = new SharedMovementStateWriter();
	private sequence = 0;
	private disposed = false;

	constructor(options: SceneInputControllerOptions) {
		this.controllerId = options.controllerId;
		this.source = options.source ?? "keyboard";
		this.eventTarget = options.eventTarget ?? window;
		this.getCameraBasis = options.getCameraBasis;
		this.onAction = options.onAction;
		this.skillBindings = options.skillBindings ?? {};

		this.eventTarget.addEventListener("keydown", this.handleKeyDown);
		this.eventTarget.addEventListener("keyup", this.handleKeyUp);
		this.eventTarget.addEventListener("blur", this.handleBlur);
	}

	/** 返回需要交给 Tick 消费者的共享移动状态。 */
	getMovementStateBuffer(): SharedArrayBuffer {
		return this.movementWriter.buffer;
	}

	/** 场景帧调用：根据当前按键与相机基准覆盖发布最新移动状态。 */
	updateMovementState(): boolean {
		if (this.disposed) return false;
		const localX =
			(this.pressedKeys.has("KeyD") || this.pressedKeys.has("ArrowRight") ? 1 : 0) +
			(this.pressedKeys.has("KeyA") || this.pressedKeys.has("ArrowLeft") ? -1 : 0);
		const localZ =
			(this.pressedKeys.has("KeyW") || this.pressedKeys.has("ArrowUp") ? 1 : 0) +
			(this.pressedKeys.has("KeyS") || this.pressedKeys.has("ArrowDown") ? -1 : 0);

		if (localX === 0 && localZ === 0) {
			return this.writeStoppedState(true);
		}

		const basis = this.getCameraBasis();
		const forward = normalizeHorizontal(basis.forward);
		const right = normalizeHorizontal(basis.right);
		if (forward === null || right === null) {
			return this.writeStoppedState(true);
		}

		const direction = normalizeHorizontal({
			x: right.x * localX + forward.x * localZ,
			z: right.z * localX + forward.z * localZ,
		});
		if (direction === null) {
			return this.writeStoppedState(true);
		}
		return this.movementWriter.write({ enabled: true, moving: true, direction, intensity: 1 });
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

		const skillId = this.skillBindings[event.code];
		if (skillId !== undefined) {
			event.preventDefault();
			this.emitSkillAction(skillId);
			return;
		}

		if (!MOVEMENT_KEYS.has(event.code) || this.pressedKeys.has(event.code)) return;
		event.preventDefault();
		this.pressedKeys.add(event.code);
		this.updateMovementState();
	};

	private readonly handleKeyUp = (event: KeyboardEvent): void => {
		if (this.disposed || !MOVEMENT_KEYS.has(event.code)) return;
		if (!this.pressedKeys.delete(event.code)) return;
		event.preventDefault();
		this.updateMovementState();
	};

	private readonly handleBlur = (): void => {
		if (this.disposed || this.pressedKeys.size === 0) return;
		this.pressedKeys.clear();
		this.updateMovementState();
	};

	private writeStoppedState(enabled: boolean): boolean {
		return this.movementWriter.write({ enabled, moving: false, direction: { x: 0, z: 0 }, intensity: 0 });
	}

	private emitSkillAction(skillId: string): void {
		this.onAction({
			type: "skill_triggered",
			skillId,
			controllerId: this.controllerId,
			sequence: ++this.sequence,
			timestampMs: Date.now(),
			source: this.source,
		});
	}
}
