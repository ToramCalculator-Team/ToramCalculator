import type { ControllerMovementState } from "~/engine/controller/controllerInput";

/**
 * SAB 中实时移动状态的一致性快照。
 *
 * 它只表示消费者读取时的最新控制状态，不保存两个 Tick 之间被覆盖的中间方向。
 */
export interface SharedMovementStateSnapshot extends ControllerMovementState {
	layoutVersion: number;
	revision: number;
}

export const SHARED_MOVEMENT_STATE_LAYOUT_VERSION = 1;

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

const storedMovementState = (state: ControllerMovementState): ControllerMovementState => ({
	enabled: state.enabled,
	moving: state.moving,
	direction: {
		x: Math.fround(state.direction.x),
		z: Math.fround(state.direction.z),
	},
	intensity: Math.fround(state.intensity),
});

const areMovementStatesEqual = (left: ControllerMovementState, right: ControllerMovementState): boolean =>
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
export class SharedMovementStateWriter {
	readonly buffer: SharedArrayBuffer;
	private readonly header: Int32Array;
	private readonly values: Float32Array;
	private currentState: ControllerMovementState | null = null;

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

	write(nextState: ControllerMovementState): boolean {
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
