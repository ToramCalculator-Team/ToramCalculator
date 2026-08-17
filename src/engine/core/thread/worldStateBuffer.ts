/**
 * 实时世界状态 SAB。
 *
 * 该文件是 Worker、UI 和渲染器共同使用的唯一连续状态协议。所有表由同一个
 * seqlock 提交号保护，消费者读取完整提交后可以跳过中间提交。离散事件、Tick
 * 历史和静态视觉资源不进入此缓冲区。
 */

import type { FrameLoopClockSnapshot, FrameLoopState } from "../FrameLoop/types";
import { evalTrajectory, type Trajectory } from "../World/Area/trajectory";
import { WORLD_AREA_CAPACITY, WORLD_AREA_CAPACITY_EXCEEDED_CODE } from "../World/Area/types";
import type { ModifierSource } from "../World/Member/runtime/AttributeContainer/AttributeContainerTypes";

export const WORLD_STATE_MAGIC = 0x57535432;
export const WORLD_STATE_LAYOUT_VERSION = 7;
export const WORLD_STATE_PLAYER_ATTRIBUTE_COUNT = 138;
export const WORLD_STATE_MOB_ATTRIBUTE_COUNT = 31;
export const WORLD_STATE_DEFAULT_MEMBER_CAPACITY = 8;
export const WORLD_STATE_DEFAULT_AREA_CAPACITY = WORLD_AREA_CAPACITY;
export const WORLD_STATE_MAX_MODIFIER_CAPACITY = 512;
export const WORLD_STATE_MAX_AREA_CAPACITY = WORLD_AREA_CAPACITY;

export const WORLD_STATE_ERROR_CODES = {
	LAYOUT_VERSION_MISMATCH: "realtime_layout_version_mismatch",
	LAYOUT_SIZE_MISMATCH: "realtime_layout_size_mismatch",
	MODIFIER_CAPACITY_EXCEEDED: "realtime_modifier_capacity_exceeded",
	MEMBER_CAPACITY_EXCEEDED: "realtime_member_capacity_exceeded",
	AREA_CAPACITY_EXCEEDED: WORLD_AREA_CAPACITY_EXCEEDED_CODE,
} as const;

export class WorldStateProtocolError extends Error {
	constructor(
		readonly code: string,
		message: string,
	) {
		super(`[${code}] ${message}`);
		this.name = "WorldStateProtocolError";
	}
}

export const STATE_FLAG_MOVING = 1 << 0;
export const STATE_FLAG_AIRBORNE = 1 << 1;

export enum WorldStateEntityType {
	PLAYER = 1,
	MOB = 2,
	SUMMON = 3,
}

export enum WorldStateAreaType {
	DAMAGE = 1,
}

export enum WorldStateAreaShapeKind {
	POINT = 1,
	CIRCLE = 2,
	RECTANGLE = 3,
}

export type VisualProfileId = number;

export type WorldStateAttributeSchemaEntry = {
	index: number;
	path: string;
	displayName: string;
	expression: string;
};

export type WorldStateMemberLayout = {
	id: string;
	entityType: WorldStateEntityType;
	visualProfileId: VisualProfileId;
	attributeOffset: number;
	attributeCount: number;
	modifierOffset: number;
	modifierCapacity: number;
};

export type WorldStateLayoutDescriptor = {
	layoutVersion: typeof WORLD_STATE_LAYOUT_VERSION;
	memberCapacity: number;
	areaCapacity: number;
	memberDirectory: WorldStateMemberLayout[];
	attributeSchema: WorldStateAttributeSchemaEntry[];
	modifierSourceMetadata: WorldStateModifierSourceMetadata[];
	modifierSourceCapacity: number;
	modifierChainCapacity: number;
	byteLength: number;
};

export type WorldStateLayoutMemberInput = Omit<
	WorldStateMemberLayout,
	"attributeOffset" | "modifierOffset" | "attributeCount" | "modifierCapacity"
> & {
	attributePaths: readonly WorldStateAttributeSchemaEntry[];
	modifierSourceMetadata?: readonly WorldStateModifierSourceMetadata[];
	modifierCount?: number;
	modifierCapacity?: number;
};

export type WorldStateMemberData = {
	id: string;
	entityType?: WorldStateEntityType;
	visualProfileId?: number;
	active?: boolean;
	position: { x: number; y: number; z: number };
	yaw: number;
	speed?: number;
	stateFlags?: number;
	/** 成员动作状态槽（ADR 0053）：只含状态名 hash、实例和逻辑起始时间，不包含动画描述。 */
	state?: {
		id: number;
		instance: number;
		startedAtLogicalTimeMs: number;
	};
	attributes?: {
		base: readonly number[];
		act: readonly number[];
	};
	modifiers?: readonly WorldStateModifierData[];
};

export type WorldStateModifierData = {
	attributeIndex: number;
	type: number;
	value: number;
	sourceIndex?: number;
	chainIndex?: number;
};

export type WorldStateAreaData = {
	id: string;
	active?: boolean;
	type?: number;
	shape?: { kind?: number; radius?: number; width?: number; height?: number };
	sourceMemberId?: string;
	targetMemberId?: string;
	/** 区域生成时的逻辑时间（毫秒）。渲染层据此 + trajectory 本地求值。 */
	spawnTimeMs: number;
	/** 生成时已解析的具体轨迹；与逻辑层共用同一套描述符。 */
	trajectory: Trajectory;
};

export type WorldStateCommit = {
	logicalTimeMs: number;
	tickIndex: number;
	clock: FrameLoopClockSnapshot;
	members: readonly WorldStateMemberData[];
	areas?: readonly WorldStateAreaData[];
	modifierSources?: readonly WorldStateModifierSource[];
	modifierChains?: readonly WorldStateModifierChain[];
};

export type WorldStateModifierSource = { idHash: number; type: number };
export type WorldStateModifierChain = { sourceIndex: number; parentIndex: number };
export type WorldStateModifierSourceMetadata = { idHash: number; source: ModifierSource };

export type WorldStateMember = {
	entityIdHash: number;
	active: boolean;
	generation: number;
	entityType: WorldStateEntityType;
	visualProfileId: number;
	position: { x: number; y: number; z: number };
	yaw: number;
	speed: number;
	stateFlags: number;
	state: {
		id: number;
		instance: number;
		startedAtLogicalTimeMs: number;
	};
	attributes: { base: number; act: number }[];
	modifiers: WorldStateModifierData[];
};

export type WorldStateArea = {
	idHash: number;
	active: boolean;
	generation: number;
	type: number;
	/** 由 reader 按 snapshot.logicalTimeMs 与 trajectory 计算，保留给旧消费者与调试。 */
	position: { x: number; y: number; z: number };
	shape: { kind: number; radius: number; width: number; height: number };
	spawnTimeMs: number;
	trajectory: Trajectory;
	sourceMemberIndex: number;
	targetMemberIndex: number;
	anchorMemberIndex: number;
};

export type WorldStateSnapshot = {
	commitVersion: number;
	logicalTimeMs: number;
	tickIndex: number;
	clock: FrameLoopClockSnapshot;
	members: WorldStateMember[];
	areas: WorldStateArea[];
	modifierSources: WorldStateModifierSource[];
	modifierChains: WorldStateModifierChain[];
};

export type WorldStateReadStats = {
	/** 调用 readLatest 的总次数 */
	reads: number;
	/** seqlock 首读与末读不一致导致的重试次数 */
	retries: number;
	/** 重试上限内未读到稳定提交而返回 null 的次数 */
	nullReturns: number;
};

const HEADER_BYTES = 96;
const HEADER_INT32_COUNT = HEADER_BYTES / Int32Array.BYTES_PER_ELEMENT;
const HDR_MAGIC = 0;
const HDR_VERSION = 1;
const HDR_MEMBER_CAPACITY = 2;
const HDR_AREA_CAPACITY = 3;
const HDR_ATTRIBUTE_COUNT = 4;
const HDR_COMMIT_VERSION = 5;
const HDR_TICK_INDEX = 6;
const HDR_SOURCE_CAPACITY = 7;
const HDR_CHAIN_CAPACITY = 8;
const HDR_SOURCE_COUNT = 9;
const HDR_CHAIN_COUNT = 10;
const HDR_CLOCK_STATE = 11;
const HDR_CLOCK_REVISION = 12;
const HDR_FLOAT_LOGICAL_TIME_MS = 56;
const HDR_FLOAT_CLOCK_SAMPLED_AT_EPOCH_MS = 64;
const HDR_FLOAT_CLOCK_TIMELINE_TIME_MS = 72;
const HDR_FLOAT_CLOCK_TIME_SCALE = 80;
const HDR_FLOAT_CLOCK_FIXED_STEP_MS = 88;

const CLOCK_STATE_CODE: Record<FrameLoopState, number> = {
	stopped: 0,
	running: 1,
	paused: 2,
};

function decodeClockState(code: number): FrameLoopState {
	switch (code) {
		case 1:
			return "running";
		case 2:
			return "paused";
		default:
			return "stopped";
	}
}

const DIRECTORY_INT32_FIELDS = 9;
const DIRECTORY_BYTES = DIRECTORY_INT32_FIELDS * Int32Array.BYTES_PER_ELEMENT;
const DIR_ACTIVE = 0;
const DIR_GENERATION = 1;
const DIR_ENTITY_TYPE = 2;
const DIR_VISUAL_PROFILE = 3;
const DIR_ATTRIBUTE_OFFSET = 4;
const DIR_ATTRIBUTE_COUNT = 5;
const DIR_MODIFIER_OFFSET = 6;
const DIR_MODIFIER_CAPACITY = 7;
const DIR_ENTITY_ID_HASH = 8;

const ATTRIBUTE_FLOAT_FIELDS = 2;
const ATTRIBUTE_BYTES = ATTRIBUTE_FLOAT_FIELDS * Float64Array.BYTES_PER_ELEMENT;

// 3 个业务 int 字段后保留一个 int，使后续 Float64 字段保持 8 字节对齐。
const STATE_INT_FIELDS = 4;
const STATE_FLOAT_FIELDS = 6;
const STATE_BYTES =
	STATE_INT_FIELDS * Int32Array.BYTES_PER_ELEMENT + STATE_FLOAT_FIELDS * Float64Array.BYTES_PER_ELEMENT;
const STATE_INT_STATE_ID = 0;
const STATE_INT_STATE_INSTANCE = 1;
const STATE_INT_FLAGS = 2;
const STATE_FLOAT_X = 0;
const STATE_FLOAT_Y = 1;
const STATE_FLOAT_Z = 2;
const STATE_FLOAT_YAW = 3;
const STATE_FLOAT_SPEED = 4;
const STATE_FLOAT_STATE_STARTED_AT = 5;

const MODIFIER_FLOAT_FIELDS = 1;
const MODIFIER_INT_FIELDS = 4;
const MODIFIER_BYTES =
	MODIFIER_FLOAT_FIELDS * Float64Array.BYTES_PER_ELEMENT + MODIFIER_INT_FIELDS * Int32Array.BYTES_PER_ELEMENT;
const MODIFIER_INT_ATTRIBUTE = 0;
const MODIFIER_INT_TYPE = 1;
const MODIFIER_INT_SOURCE = 2;
const MODIFIER_INT_CHAIN = 3;
const SOURCE_BYTES = 8;
const CHAIN_BYTES = 8;

const AREA_INT_FIELDS = 10;
const AREA_FLOAT_FIELDS = 15;
const AREA_BYTES = AREA_INT_FIELDS * Int32Array.BYTES_PER_ELEMENT + AREA_FLOAT_FIELDS * Float64Array.BYTES_PER_ELEMENT;
const AREA_INT_ACTIVE = 0;
const AREA_INT_GENERATION = 1;
const AREA_INT_TYPE = 2;
const AREA_INT_SHAPE = 3;
const AREA_INT_SOURCE_MEMBER = 4;
const AREA_INT_TARGET_MEMBER = 5;
const AREA_INT_ANCHOR_MEMBER = 6;
const AREA_INT_TRAJECTORY_KIND = 7;
const AREA_INT_ID_HASH = 8;
const AREA_INT_RESERVED = 9;
const AREA_FLOAT_A_X = 0;
const AREA_FLOAT_A_Y = 1;
const AREA_FLOAT_A_Z = 2;
const AREA_FLOAT_B_X = 3;
const AREA_FLOAT_B_Y = 4;
const AREA_FLOAT_B_Z = 5;
const AREA_FLOAT_S0 = 6;
const AREA_FLOAT_S1 = 7;
const AREA_FLOAT_S2 = 8;
const AREA_FLOAT_S3 = 9;
const AREA_FLOAT_S4 = 10;
const AREA_FLOAT_SPAWN_TIME = 11;
const AREA_FLOAT_SHAPE_RADIUS = 12;
const AREA_FLOAT_SHAPE_WIDTH = 13;
const AREA_FLOAT_SHAPE_HEIGHT = 14;

const AREA_TRAJECTORY_KIND = {
	STATIC: 1,
	ATTACH: 2,
	SEGMENT: 3,
	RAY: 4,
	ARC: 5,
	SPIRAL: 6,
} as const;

function areaTrajectoryKindCode(kind: Trajectory["kind"]): number {
	switch (kind) {
		case "static":
			return AREA_TRAJECTORY_KIND.STATIC;
		case "attach":
			return AREA_TRAJECTORY_KIND.ATTACH;
		case "segment":
			return AREA_TRAJECTORY_KIND.SEGMENT;
		case "ray":
			return AREA_TRAJECTORY_KIND.RAY;
		case "arc":
			return AREA_TRAJECTORY_KIND.ARC;
		case "spiral":
			return AREA_TRAJECTORY_KIND.SPIRAL;
	}
}

function decodeAreaTrajectory(kindCode: number, floats: Float64Array): Trajectory {
	const a = { x: floats[AREA_FLOAT_A_X], y: floats[AREA_FLOAT_A_Y], z: floats[AREA_FLOAT_A_Z] };
	const b = { x: floats[AREA_FLOAT_B_X], y: floats[AREA_FLOAT_B_Y], z: floats[AREA_FLOAT_B_Z] };
	switch (kindCode) {
		case AREA_TRAJECTORY_KIND.STATIC:
			return { kind: "static", center: a, lifetimeMs: floats[AREA_FLOAT_S0] };
		case AREA_TRAJECTORY_KIND.ATTACH:
			return {
				kind: "attach",
				anchor: "source",
				offset: a,
				lifetimeMs: floats[AREA_FLOAT_S0],
			};
		case AREA_TRAJECTORY_KIND.SEGMENT:
			return { kind: "segment", from: a, to: b, speed: floats[AREA_FLOAT_S0] };
		case AREA_TRAJECTORY_KIND.RAY:
			return { kind: "ray", from: a, dir: b, speed: floats[AREA_FLOAT_S0], maxDistance: floats[AREA_FLOAT_S1] };
		case AREA_TRAJECTORY_KIND.ARC:
			return {
				kind: "arc",
				center: a,
				normal: b,
				radius: floats[AREA_FLOAT_S0],
				startAngle: floats[AREA_FLOAT_S1],
				endAngle: floats[AREA_FLOAT_S2],
				speed: floats[AREA_FLOAT_S3],
			};
		case AREA_TRAJECTORY_KIND.SPIRAL:
			return {
				kind: "spiral",
				center: a,
				normal: b,
				startAngle: floats[AREA_FLOAT_S0],
				startRadius: floats[AREA_FLOAT_S1],
				endRadius: floats[AREA_FLOAT_S2],
				radiusGrowthPerRadian: floats[AREA_FLOAT_S3],
				speed: floats[AREA_FLOAT_S4],
			};
		default:
			return { kind: "static", center: { x: 0, y: 0, z: 0 }, lifetimeMs: 0 };
	}
}

const MAX_SEQLOCK_RETRIES = 8;

function align(value: number, alignment: number): number {
	return Math.ceil(value / alignment) * alignment;
}

function nextPowerOfTwo(value: number): number {
	let result = 1;
	while (result < value) result *= 2;
	return result;
}

export function worldStateStringId(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index++) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash & 0x7fffffff || 1;
}

export function calculateModifierCapacity(entryCount: number): number {
	if (!Number.isInteger(entryCount) || entryCount < 0) throw new Error(`非法 modifier entry 数量: ${entryCount}`);
	const capacity = nextPowerOfTwo(Math.max(128, entryCount + 80));
	if (capacity > WORLD_STATE_MAX_MODIFIER_CAPACITY) {
		throw new WorldStateProtocolError(
			WORLD_STATE_ERROR_CODES.MODIFIER_CAPACITY_EXCEEDED,
			`modifier 容量超限: ${capacity} > ${WORLD_STATE_MAX_MODIFIER_CAPACITY}`,
		);
	}
	return capacity;
}

function layoutByteLength(
	memberCapacity: number,
	attributeCount: number,
	modifierCapacity: number,
	sourceCapacity: number,
	chainCapacity: number,
	areaCapacity: number,
): number {
	let offset = HEADER_BYTES;
	offset = align(offset + memberCapacity * DIRECTORY_BYTES, 8);
	offset = align(offset + attributeCount * ATTRIBUTE_BYTES, 8);
	offset = align(offset + memberCapacity * STATE_BYTES, 8);
	offset = align(offset + modifierCapacity * MODIFIER_BYTES, 8);
	offset = align(offset + sourceCapacity * SOURCE_BYTES, 8);
	offset = align(offset + chainCapacity * CHAIN_BYTES, 8);
	offset = align(offset + areaCapacity * AREA_BYTES, 8);
	return offset;
}

function validateCapacity(memberCapacity: number, areaCapacity: number): void {
	if (!Number.isInteger(memberCapacity) || memberCapacity < 0) throw new Error(`非法成员容量: ${memberCapacity}`);
	if (!Number.isInteger(areaCapacity) || areaCapacity < 0 || areaCapacity > WORLD_STATE_MAX_AREA_CAPACITY) {
		throw new WorldStateProtocolError(
			WORLD_STATE_ERROR_CODES.AREA_CAPACITY_EXCEEDED,
			`area 容量超限: ${areaCapacity} > ${WORLD_STATE_MAX_AREA_CAPACITY}`,
		);
	}
}

/** 根据场景装配后的属性和 modifier 条目生成一次性布局。 */
export function createWorldStateLayoutDescriptor(
	members: readonly WorldStateLayoutMemberInput[],
	options: { memberCapacity?: number; areaCapacity?: number } = {},
): WorldStateLayoutDescriptor {
	const memberCapacity = Math.max(members.length, options.memberCapacity ?? WORLD_STATE_DEFAULT_MEMBER_CAPACITY);
	const areaCapacity = options.areaCapacity ?? WORLD_STATE_DEFAULT_AREA_CAPACITY;
	validateCapacity(memberCapacity, areaCapacity);
	const memberDirectory: WorldStateMemberLayout[] = [];
	const attributeSchema: WorldStateAttributeSchemaEntry[] = [];
	const memberIds = new Set<string>();
	const modifierSourceMetadata = new Map<number, WorldStateModifierSourceMetadata>();
	let attributeOffset = 0;
	let modifierOffset = 0;
	for (const member of members) {
		if (memberIds.has(member.id)) throw new Error(`实时世界状态成员 ID 重复: ${member.id}`);
		memberIds.add(member.id);
		for (const metadata of member.modifierSourceMetadata ?? []) {
			const previous = modifierSourceMetadata.get(metadata.idHash);
			if (previous && previous.source.key !== metadata.source.key) {
				throw new Error(`modifier 来源 hash 冲突: ${previous.source.key} / ${metadata.source.key}`);
			}
			modifierSourceMetadata.set(metadata.idHash, metadata);
		}
		const paths = Array.from(new Map(member.attributePaths.map((entry) => [entry.path, entry])).values());
		const count = paths.length;
		const schemaOffset = attributeSchema.length;
		attributeSchema.push(...paths.map((entry, index) => ({ ...entry, index: schemaOffset + index })));
		const modifierCapacity = member.modifierCapacity ?? calculateModifierCapacity(member.modifierCount ?? 0);
		if (
			!Number.isInteger(modifierCapacity) ||
			modifierCapacity < 0 ||
			modifierCapacity > WORLD_STATE_MAX_MODIFIER_CAPACITY
		) {
			throw new WorldStateProtocolError(
				WORLD_STATE_ERROR_CODES.MODIFIER_CAPACITY_EXCEEDED,
				`成员 ${member.id} 的 modifier 容量非法: ${modifierCapacity}`,
			);
		}
		memberDirectory.push({
			id: member.id,
			entityType: member.entityType,
			visualProfileId: member.visualProfileId,
			attributeOffset,
			attributeCount: count,
			modifierOffset,
			modifierCapacity,
		});
		attributeOffset += count;
		modifierOffset += modifierCapacity;
	}
	while (memberDirectory.length < memberCapacity) {
		memberDirectory.push({
			id: `__empty_${memberDirectory.length}`,
			entityType: WorldStateEntityType.SUMMON,
			visualProfileId: 0,
			attributeOffset,
			attributeCount: 0,
			modifierOffset,
			modifierCapacity: 0,
		});
	}
	const modifierSourceCapacity = Math.max(1, modifierOffset);
	const modifierChainCapacity = modifierSourceCapacity;
	return {
		layoutVersion: WORLD_STATE_LAYOUT_VERSION,
		memberCapacity,
		areaCapacity,
		memberDirectory,
		attributeSchema,
		modifierSourceMetadata: Array.from(modifierSourceMetadata.values()),
		modifierSourceCapacity,
		modifierChainCapacity,
		byteLength: layoutByteLength(
			memberCapacity,
			attributeSchema.length,
			modifierOffset,
			modifierSourceCapacity,
			modifierChainCapacity,
			areaCapacity,
		),
	};
}

function offsets(descriptor: WorldStateLayoutDescriptor) {
	let offset = HEADER_BYTES;
	const directoryOffset = offset;
	offset = align(offset + descriptor.memberCapacity * DIRECTORY_BYTES, 8);
	const attributeOffset = offset;
	offset = align(offset + descriptor.attributeSchema.length * ATTRIBUTE_BYTES, 8);
	const stateOffset = offset;
	offset = align(offset + descriptor.memberCapacity * STATE_BYTES, 8);
	const modifierOffset = offset;
	offset = align(
		offset + descriptor.memberDirectory.reduce((sum, member) => sum + member.modifierCapacity, 0) * MODIFIER_BYTES,
		8,
	);
	const modifierSourceOffset = offset;
	offset = align(offset + descriptor.modifierSourceCapacity * SOURCE_BYTES, 8);
	const modifierChainOffset = offset;
	offset = align(offset + descriptor.modifierChainCapacity * CHAIN_BYTES, 8);
	const areaOffset = offset;
	return {
		directoryOffset,
		attributeOffset,
		stateOffset,
		modifierOffset,
		modifierSourceOffset,
		modifierChainOffset,
		areaOffset,
	};
}

function validateDescriptor(descriptor: WorldStateLayoutDescriptor): void {
	if (descriptor.layoutVersion !== WORLD_STATE_LAYOUT_VERSION) {
		throw new WorldStateProtocolError(
			WORLD_STATE_ERROR_CODES.LAYOUT_VERSION_MISMATCH,
			`不支持的布局版本: ${descriptor.layoutVersion}`,
		);
	}
	validateCapacity(descriptor.memberCapacity, descriptor.areaCapacity);
	if (descriptor.memberDirectory.length !== descriptor.memberCapacity) throw new Error("成员目录长度与容量不一致");
	if (
		!Number.isInteger(descriptor.modifierSourceCapacity) ||
		!Number.isInteger(descriptor.modifierChainCapacity) ||
		descriptor.modifierSourceCapacity < 0 ||
		descriptor.modifierChainCapacity < 0
	)
		throw new Error("modifier 来源表容量非法");
	if (
		descriptor.byteLength !==
		layoutByteLength(
			descriptor.memberCapacity,
			descriptor.attributeSchema.length,
			descriptor.memberDirectory.reduce((sum, member) => sum + member.modifierCapacity, 0),
			descriptor.modifierSourceCapacity,
			descriptor.modifierChainCapacity,
			descriptor.areaCapacity,
		)
	) {
		throw new WorldStateProtocolError(WORLD_STATE_ERROR_CODES.LAYOUT_SIZE_MISMATCH, "实时世界状态布局长度不一致");
	}
	const memberIds = new Set<string>();
	let attributeOffset = 0;
	let modifierOffset = 0;
	for (const member of descriptor.memberDirectory) {
		if (memberIds.has(member.id)) throw new Error(`实时世界状态成员 ID 重复: ${member.id}`);
		memberIds.add(member.id);
		if (
			!Number.isInteger(member.attributeOffset) ||
			!Number.isInteger(member.attributeCount) ||
			!Number.isInteger(member.modifierOffset) ||
			!Number.isInteger(member.modifierCapacity) ||
			member.attributeOffset !== attributeOffset ||
			member.modifierOffset !== modifierOffset
		)
			throw new Error("实时世界状态目录 offset 不连续");
		if (
			member.attributeCount < 0 ||
			member.modifierCapacity < 0 ||
			member.modifierCapacity > WORLD_STATE_MAX_MODIFIER_CAPACITY
		) {
			throw new WorldStateProtocolError(
				WORLD_STATE_ERROR_CODES.MODIFIER_CAPACITY_EXCEEDED,
				`成员 ${member.id} 的布局容量非法`,
			);
		}
		attributeOffset += member.attributeCount;
		modifierOffset += member.modifierCapacity;
	}
	if (attributeOffset !== descriptor.attributeSchema.length) throw new Error("属性目录数量与 schema 不一致");
	descriptor.attributeSchema.forEach((entry, index) => {
		if (entry.index !== index) throw new Error(`属性 schema 索引不连续: ${entry.index}，期望 ${index}`);
	});
	const sourceHashes = new Set<number>();
	for (const metadata of descriptor.modifierSourceMetadata) {
		if (sourceHashes.has(metadata.idHash)) throw new Error(`modifier 来源元数据 hash 重复: ${metadata.idHash}`);
		sourceHashes.add(metadata.idHash);
	}
}

export function createWorldStateBuffer(descriptor: WorldStateLayoutDescriptor): SharedArrayBuffer {
	validateDescriptor(descriptor);
	const buffer = new SharedArrayBuffer(descriptor.byteLength);
	const header = new Int32Array(buffer, 0, HEADER_INT32_COUNT);
	header[HDR_MAGIC] = WORLD_STATE_MAGIC;
	header[HDR_VERSION] = descriptor.layoutVersion;
	header[HDR_MEMBER_CAPACITY] = descriptor.memberCapacity;
	header[HDR_AREA_CAPACITY] = descriptor.areaCapacity;
	header[HDR_ATTRIBUTE_COUNT] = descriptor.attributeSchema.length;
	header[HDR_SOURCE_CAPACITY] = descriptor.modifierSourceCapacity;
	header[HDR_CHAIN_CAPACITY] = descriptor.modifierChainCapacity;
	Atomics.store(header, HDR_COMMIT_VERSION, 0);
	Atomics.store(header, HDR_TICK_INDEX, 0);
	Atomics.store(header, HDR_SOURCE_COUNT, 0);
	Atomics.store(header, HDR_CHAIN_COUNT, 0);
	Atomics.store(header, HDR_CLOCK_STATE, CLOCK_STATE_CODE.stopped);
	Atomics.store(header, HDR_CLOCK_REVISION, 0);
	const view = new DataView(buffer);
	view.setFloat64(HDR_FLOAT_LOGICAL_TIME_MS, 0, true);
	view.setFloat64(HDR_FLOAT_CLOCK_SAMPLED_AT_EPOCH_MS, 0, true);
	view.setFloat64(HDR_FLOAT_CLOCK_TIMELINE_TIME_MS, 0, true);
	view.setFloat64(HDR_FLOAT_CLOCK_TIME_SCALE, 1, true);
	view.setFloat64(HDR_FLOAT_CLOCK_FIXED_STEP_MS, 1000 / 60, true);
	const bufferOffsets = offsets(descriptor);
	for (let index = 0; index < descriptor.memberDirectory.length; index++) {
		const member = descriptor.memberDirectory[index];
		const base = bufferOffsets.directoryOffset + index * DIRECTORY_BYTES;
		view.setInt32(base + DIR_ACTIVE * 4, 0, true);
		view.setInt32(base + DIR_GENERATION * 4, 0, true);
		view.setInt32(base + DIR_ENTITY_TYPE * 4, member.entityType, true);
		view.setInt32(base + DIR_VISUAL_PROFILE * 4, member.visualProfileId, true);
		view.setInt32(base + DIR_ATTRIBUTE_OFFSET * 4, member.attributeOffset, true);
		view.setInt32(base + DIR_ATTRIBUTE_COUNT * 4, member.attributeCount, true);
		view.setInt32(base + DIR_MODIFIER_OFFSET * 4, member.modifierOffset, true);
		view.setInt32(base + DIR_MODIFIER_CAPACITY * 4, member.modifierCapacity, true);
		view.setInt32(
			base + DIR_ENTITY_ID_HASH * 4,
			member.id.startsWith("__empty_") ? 0 : worldStateStringId(member.id),
			true,
		);
	}
	const modifierCapacity = descriptor.memberDirectory.reduce((sum, member) => sum + member.modifierCapacity, 0);
	for (let index = 0; index < modifierCapacity; index++) {
		view.setInt32(bufferOffsets.modifierOffset + index * MODIFIER_BYTES + MODIFIER_INT_ATTRIBUTE * 4, -1, true);
	}
	return buffer;
}

function readHeader(buffer: SharedArrayBuffer) {
	if (buffer.byteLength < HEADER_BYTES)
		throw new Error(`非法实时世界状态 SAB magic: buffer 长度不足 (${buffer.byteLength})`);
	const header = new Int32Array(buffer, 0, HEADER_INT32_COUNT);
	if (Atomics.load(header, HDR_MAGIC) !== WORLD_STATE_MAGIC) throw new Error("非法实时世界状态 SAB magic");
	if (Atomics.load(header, HDR_VERSION) !== WORLD_STATE_LAYOUT_VERSION) {
		throw new WorldStateProtocolError(WORLD_STATE_ERROR_CODES.LAYOUT_VERSION_MISMATCH, "不支持的实时世界状态布局版本");
	}
	const memberCapacity = Atomics.load(header, HDR_MEMBER_CAPACITY);
	const areaCapacity = Atomics.load(header, HDR_AREA_CAPACITY);
	const attributeCount = Atomics.load(header, HDR_ATTRIBUTE_COUNT);
	validateCapacity(memberCapacity, areaCapacity);
	return {
		header,
		memberCapacity,
		areaCapacity,
		attributeCount,
		modifierSourceCapacity: Atomics.load(header, HDR_SOURCE_CAPACITY),
		modifierChainCapacity: Atomics.load(header, HDR_CHAIN_CAPACITY),
	};
}

export class WorldStateWriter {
	private readonly header: Int32Array;
	private readonly data: DataView;
	private readonly descriptor: WorldStateLayoutDescriptor;
	private readonly memberOffsets: ReturnType<typeof offsets>;
	private readonly fixedMemberSlots = new Map<string, number>();
	private readonly dynamicMemberSlots = new Map<string, number>();
	private readonly memberSlotOwners: Array<string | null>;
	private readonly memberSlotGenerations: number[];
	private readonly memberSlotActive: boolean[];
	private readonly areaSlots = new Map<string, number>();
	private readonly areaSlotOwners: Array<string | null>;
	private readonly areaSlotGenerations: number[];

	constructor(buffer: SharedArrayBuffer, descriptor: WorldStateLayoutDescriptor) {
		const header = readHeader(buffer);
		validateDescriptor(descriptor);
		if (
			buffer.byteLength !== descriptor.byteLength ||
			header.memberCapacity !== descriptor.memberCapacity ||
			header.areaCapacity !== descriptor.areaCapacity ||
			header.attributeCount !== descriptor.attributeSchema.length ||
			header.modifierSourceCapacity !== descriptor.modifierSourceCapacity ||
			header.modifierChainCapacity !== descriptor.modifierChainCapacity
		) {
			throw new WorldStateProtocolError(
				WORLD_STATE_ERROR_CODES.LAYOUT_SIZE_MISMATCH,
				"实时世界状态 SAB 与布局描述符不匹配",
			);
		}
		this.header = header.header;
		this.data = new DataView(buffer);
		this.descriptor = descriptor;
		this.memberOffsets = offsets(descriptor);
		this.memberSlotOwners = descriptor.memberDirectory.map((member, slot) => {
			if (member.id.startsWith("__empty_")) return null;
			this.fixedMemberSlots.set(member.id, slot);
			return member.id;
		});
		this.memberSlotGenerations = descriptor.memberDirectory.map(() => 0);
		this.memberSlotActive = descriptor.memberDirectory.map(() => false);
		this.areaSlotOwners = Array.from({ length: descriptor.areaCapacity }, () => null);
		this.areaSlotGenerations = Array.from({ length: descriptor.areaCapacity }, () => 0);
	}

	/** 以单个提交序号写入成员、属性、modifier、区域和动作状态。 */
	write(payload: WorldStateCommit): void {
		const sources = payload.modifierSources ?? [];
		const chains = payload.modifierChains ?? [];
		const areas = payload.areas ?? [];
		if (
			sources.length > this.descriptor.modifierSourceCapacity ||
			chains.length > this.descriptor.modifierChainCapacity
		) {
			throw new WorldStateProtocolError(
				WORLD_STATE_ERROR_CODES.MODIFIER_CAPACITY_EXCEEDED,
				"modifier 来源或链表容量不足",
			);
		}
		if (areas.filter((area) => area.active !== false).length > this.descriptor.areaCapacity) {
			throw new WorldStateProtocolError(
				WORLD_STATE_ERROR_CODES.AREA_CAPACITY_EXCEEDED,
				`area 数量超出布局: ${areas.length} > ${this.descriptor.areaCapacity}`,
			);
		}
		this.validateModifierChains(chains, sources.length);
		const memberPlan = this.planMembers(payload.members, sources.length, chains.length);
		const areaPlan = this.planAreas(areas, new Map(memberPlan.map(({ member, slot }) => [member.id, slot])));

		Atomics.add(this.header, HDR_COMMIT_VERSION, 1);
		try {
			Atomics.store(this.header, HDR_TICK_INDEX, Math.trunc(payload.tickIndex));
			Atomics.store(this.header, HDR_SOURCE_COUNT, sources.length);
			Atomics.store(this.header, HDR_CHAIN_COUNT, chains.length);
			Atomics.store(this.header, HDR_CLOCK_STATE, CLOCK_STATE_CODE[payload.clock.state]);
			Atomics.store(this.header, HDR_CLOCK_REVISION, payload.clock.revision);
			this.data.setFloat64(HDR_FLOAT_LOGICAL_TIME_MS, payload.logicalTimeMs, true);
			this.data.setFloat64(HDR_FLOAT_CLOCK_SAMPLED_AT_EPOCH_MS, payload.clock.sampledAtEpochMs, true);
			this.data.setFloat64(HDR_FLOAT_CLOCK_TIMELINE_TIME_MS, payload.clock.timelineTimeMs, true);
			this.data.setFloat64(HDR_FLOAT_CLOCK_TIME_SCALE, payload.clock.timeScale, true);
			this.data.setFloat64(HDR_FLOAT_CLOCK_FIXED_STEP_MS, payload.clock.fixedStepMs, true);
			this.applyMemberPlan(memberPlan);
			this.writeModifierMetadata(sources, chains);
			this.applyAreaPlan(areaPlan);
		} finally {
			Atomics.add(this.header, HDR_COMMIT_VERSION, 1);
		}
	}

	/** modifier 链属于同一个原子提交，引用错误必须在进入 seqlock 前显形。 */
	private validateModifierChains(chains: readonly WorldStateModifierChain[], sourceCount: number): void {
		for (const [index, chain] of chains.entries()) {
			if (!Number.isInteger(chain.sourceIndex) || chain.sourceIndex < 0 || chain.sourceIndex >= sourceCount) {
				throw new Error(`modifier 链 ${index} 的来源索引越界: ${chain.sourceIndex}`);
			}
			if (!Number.isInteger(chain.parentIndex) || chain.parentIndex < -1 || chain.parentIndex >= chains.length) {
				throw new Error(`modifier 链 ${index} 的父链索引越界: ${chain.parentIndex}`);
			}
		}
	}

	private planMembers(
		members: readonly WorldStateMemberData[],
		sourceCount: number,
		chainCount: number,
	): Array<{ member: WorldStateMemberData; slot: number; newOwner: boolean }> {
		const activeMembers = members.filter((member) => member.active !== false);
		const submittedIds = new Set<string>();
		for (const member of members) {
			if (submittedIds.has(member.id)) throw new Error(`实时世界状态提交包含重复成员 ID: ${member.id}`);
			submittedIds.add(member.id);
		}
		const activeIds = new Set(activeMembers.map((member) => member.id));
		const freeSlots = this.memberSlotOwners.flatMap((owner, slot) => {
			if (owner === null) return [slot];
			return this.dynamicMemberSlots.get(owner) === slot && !activeIds.has(owner) ? [slot] : [];
		});
		const reserved = new Set<number>();
		return activeMembers.map((member) => {
			const fixed = this.fixedMemberSlots.get(member.id);
			const dynamic = this.dynamicMemberSlots.get(member.id);
			let slot = fixed ?? dynamic;
			let newOwner = false;
			if (slot === undefined) {
				slot = freeSlots.find((candidate) => !reserved.has(candidate));
				if (slot === undefined) {
					throw new WorldStateProtocolError(
						WORLD_STATE_ERROR_CODES.MEMBER_CAPACITY_EXCEEDED,
						`成员 ${member.id} 无可用实时状态槽位`,
					);
				}
				reserved.add(slot);
				newOwner = true;
			}
			const layout = this.descriptor.memberDirectory[slot];
			const attributes = member.attributes;
			if (
				attributes &&
				(attributes.base.length !== layout.attributeCount || attributes.act.length !== layout.attributeCount)
			) {
				throw new Error(`成员 ${member.id} 属性数量与槽位布局不一致`);
			}
			const modifiers = member.modifiers ?? [];
			if (modifiers.length > layout.modifierCapacity) {
				throw new WorldStateProtocolError(
					WORLD_STATE_ERROR_CODES.MODIFIER_CAPACITY_EXCEEDED,
					`成员 ${member.id} modifier entry 超出容量: ${modifiers.length} > ${layout.modifierCapacity}`,
				);
			}
			for (const modifier of modifiers) {
				if (
					!Number.isInteger(modifier.attributeIndex) ||
					modifier.attributeIndex < 0 ||
					modifier.attributeIndex >= layout.attributeCount
				) {
					throw new Error(`成员 ${member.id} modifier 属性索引越界: ${modifier.attributeIndex}`);
				}
				const sourceIndex = modifier.sourceIndex ?? -1;
				const chainIndex = modifier.chainIndex ?? -1;
				if (
					!Number.isInteger(sourceIndex) ||
					sourceIndex < -1 ||
					sourceIndex >= sourceCount ||
					!Number.isInteger(chainIndex) ||
					chainIndex < -1 ||
					chainIndex >= chainCount
				) {
					throw new Error(`成员 ${member.id} modifier 来源索引越界`);
				}
			}
			return { member, slot, newOwner };
		});
	}

	private applyMemberPlan(plan: Array<{ member: WorldStateMemberData; slot: number; newOwner: boolean }>): void {
		const seenSlots = new Set(plan.map((entry) => entry.slot));
		for (let slot = 0; slot < this.descriptor.memberCapacity; slot++) {
			if (seenSlots.has(slot)) continue;
			this.deactivateMemberSlot(slot);
		}
		for (const { member, slot, newOwner } of plan) {
			if (newOwner) {
				const previousOwner = this.memberSlotOwners[slot];
				if (previousOwner) this.dynamicMemberSlots.delete(previousOwner);
				this.memberSlotOwners[slot] = member.id;
				this.dynamicMemberSlots.set(member.id, slot);
				this.memberSlotGenerations[slot]++;
			} else if (!this.memberSlotActive[slot]) {
				this.memberSlotGenerations[slot]++;
			}
			this.memberSlotActive[slot] = true;
			this.writeMember(slot, member, this.memberSlotGenerations[slot]);
		}
	}

	private deactivateMemberSlot(slot: number): void {
		const directory = this.memberOffsets.directoryOffset + slot * DIRECTORY_BYTES;
		const state = this.memberOffsets.stateOffset + slot * STATE_BYTES;
		this.data.setInt32(directory + DIR_ACTIVE * 4, 0, true);
		this.data.setInt32(state + STATE_INT_STATE_ID * 4, 0, true);
		this.data.setInt32(state + STATE_INT_STATE_INSTANCE * 4, 0, true);
		this.data.setInt32(state + STATE_INT_FLAGS * 4, 0, true);
		this.memberSlotActive[slot] = false;
		const owner = this.memberSlotOwners[slot];
		if (owner && this.dynamicMemberSlots.get(owner) === slot) {
			this.dynamicMemberSlots.delete(owner);
			this.memberSlotOwners[slot] = null;
			this.data.setInt32(directory + DIR_ENTITY_ID_HASH * 4, 0, true);
		}
	}

	private writeMember(slot: number, member: WorldStateMemberData, generation: number): void {
		const layout = this.descriptor.memberDirectory[slot];
		const directory = this.memberOffsets.directoryOffset + slot * DIRECTORY_BYTES;
		const stateOffset = this.memberOffsets.stateOffset + slot * STATE_BYTES;
		const state = member.state ?? { id: 0, instance: 0, startedAtLogicalTimeMs: 0 };
		this.data.setInt32(directory + DIR_ACTIVE * 4, 1, true);
		this.data.setInt32(directory + DIR_GENERATION * 4, generation, true);
		this.data.setInt32(directory + DIR_ENTITY_TYPE * 4, member.entityType ?? layout.entityType, true);
		this.data.setInt32(directory + DIR_VISUAL_PROFILE * 4, member.visualProfileId ?? layout.visualProfileId, true);
		this.data.setInt32(directory + DIR_ENTITY_ID_HASH * 4, worldStateStringId(member.id), true);
		this.data.setInt32(stateOffset + STATE_INT_STATE_ID * 4, state.id, true);
		this.data.setInt32(stateOffset + STATE_INT_STATE_INSTANCE * 4, state.instance, true);
		this.data.setInt32(stateOffset + STATE_INT_FLAGS * 4, member.stateFlags ?? 0, true);
		const floats = [
			member.position.x,
			member.position.y,
			member.position.z,
			member.yaw,
			member.speed ?? 0,
			state.startedAtLogicalTimeMs,
		];
		for (let index = 0; index < floats.length; index++)
			this.data.setFloat64(stateOffset + STATE_INT_FIELDS * 4 + index * 8, floats[index], true);
		const attrs = member.attributes;
		for (let index = 0; index < layout.attributeCount; index++) {
			const offset = this.memberOffsets.attributeOffset + (layout.attributeOffset + index) * ATTRIBUTE_BYTES;
			this.data.setFloat64(offset, attrs?.base[index] ?? 0, true);
			this.data.setFloat64(offset + 8, attrs?.act[index] ?? 0, true);
		}
		const modifiers = member.modifiers ?? [];
		for (let index = 0; index < layout.modifierCapacity; index++) {
			const offset = this.memberOffsets.modifierOffset + (layout.modifierOffset + index) * MODIFIER_BYTES;
			const modifier = modifiers[index];
			this.data.setInt32(offset + MODIFIER_INT_ATTRIBUTE * 4, modifier?.attributeIndex ?? -1, true);
			this.data.setInt32(offset + MODIFIER_INT_TYPE * 4, modifier?.type ?? 0, true);
			this.data.setInt32(offset + MODIFIER_INT_SOURCE * 4, modifier?.sourceIndex ?? -1, true);
			this.data.setInt32(offset + MODIFIER_INT_CHAIN * 4, modifier?.chainIndex ?? -1, true);
			this.data.setFloat64(offset + MODIFIER_INT_FIELDS * 4, modifier?.value ?? 0, true);
		}
	}

	private writeModifierMetadata(
		sources: readonly WorldStateModifierSource[],
		chains: readonly WorldStateModifierChain[],
	): void {
		for (let index = 0; index < this.descriptor.modifierSourceCapacity; index++) {
			const offset = this.memberOffsets.modifierSourceOffset + index * SOURCE_BYTES;
			this.data.setInt32(offset, sources[index]?.idHash ?? 0, true);
			this.data.setInt32(offset + 4, sources[index]?.type ?? 0, true);
		}
		for (let index = 0; index < this.descriptor.modifierChainCapacity; index++) {
			const offset = this.memberOffsets.modifierChainOffset + index * CHAIN_BYTES;
			this.data.setInt32(offset, chains[index]?.sourceIndex ?? -1, true);
			this.data.setInt32(offset + 4, chains[index]?.parentIndex ?? -1, true);
		}
	}

	private planAreas(
		areas: readonly WorldStateAreaData[],
		memberSlots: ReadonlyMap<string, number>,
	): Array<{
		area: WorldStateAreaData;
		slot: number;
		newOwner: boolean;
		sourceMemberIndex: number;
		targetMemberIndex: number;
	}> {
		const activeAreas = areas.filter((area) => area.active !== false);
		const submittedIds = new Set<string>();
		for (const area of areas) {
			if (submittedIds.has(area.id)) throw new Error(`实时世界状态提交包含重复区域 ID: ${area.id}`);
			submittedIds.add(area.id);
		}
		const activeIds = new Set(activeAreas.map((area) => area.id));
		const freeSlots = this.areaSlotOwners.flatMap((owner, slot) =>
			owner === null || !activeIds.has(owner) ? [slot] : [],
		);
		const reserved = new Set<number>();
		return activeAreas.map((area) => {
			let slot = this.areaSlots.get(area.id);
			let newOwner = false;
			if (slot === undefined) {
				slot = freeSlots.find((candidate) => !reserved.has(candidate));
				if (slot === undefined) {
					throw new WorldStateProtocolError(
						WORLD_STATE_ERROR_CODES.AREA_CAPACITY_EXCEEDED,
						`区域 ${area.id} 无可用实时状态槽位`,
					);
				}
				reserved.add(slot);
				newOwner = true;
			}
			const sourceMemberIndex = area.sourceMemberId ? (memberSlots.get(area.sourceMemberId) ?? -1) : -1;
			const targetMemberIndex = area.targetMemberId ? (memberSlots.get(area.targetMemberId) ?? -1) : -1;
			return { area, slot, newOwner, sourceMemberIndex, targetMemberIndex };
		});
	}

	private applyAreaPlan(
		plan: Array<{
			area: WorldStateAreaData;
			slot: number;
			newOwner: boolean;
			sourceMemberIndex: number;
			targetMemberIndex: number;
		}>,
	): void {
		const seenSlots = new Set(plan.map((entry) => entry.slot));
		for (let slot = 0; slot < this.descriptor.areaCapacity; slot++) {
			if (seenSlots.has(slot)) continue;
			const owner = this.areaSlotOwners[slot];
			if (owner) this.areaSlots.delete(owner);
			this.areaSlotOwners[slot] = null;
			this.writeArea(slot);
		}
		for (const { area, slot, newOwner, sourceMemberIndex, targetMemberIndex } of plan) {
			if (newOwner) {
				const previousOwner = this.areaSlotOwners[slot];
				if (previousOwner) this.areaSlots.delete(previousOwner);
				this.areaSlotOwners[slot] = area.id;
				this.areaSlots.set(area.id, slot);
				this.areaSlotGenerations[slot]++;
			}
			this.writeArea(slot, area, this.areaSlotGenerations[slot], sourceMemberIndex, targetMemberIndex);
		}
	}

	private writeArea(
		index: number,
		area?: WorldStateAreaData,
		generation = 0,
		sourceMemberIndex = -1,
		targetMemberIndex = -1,
	): void {
		const offset = this.memberOffsets.areaOffset + index * AREA_BYTES;
		const active = area ? area.active !== false : false;
		const trajectory = area?.trajectory;
		this.data.setInt32(offset + AREA_INT_ACTIVE * 4, active ? 1 : 0, true);
		this.data.setInt32(offset + AREA_INT_GENERATION * 4, generation, true);
		this.data.setInt32(offset + AREA_INT_TYPE * 4, area?.type ?? 0, true);
		this.data.setInt32(offset + AREA_INT_SHAPE * 4, area?.shape?.kind ?? 0, true);
		this.data.setInt32(offset + AREA_INT_SOURCE_MEMBER * 4, sourceMemberIndex, true);
		this.data.setInt32(offset + AREA_INT_TARGET_MEMBER * 4, targetMemberIndex, true);
		this.data.setInt32(
			offset + AREA_INT_ANCHOR_MEMBER * 4,
			trajectory?.kind === "attach" ? (trajectory.anchor === "source" ? sourceMemberIndex : targetMemberIndex) : -1,
			true,
		);
		this.data.setInt32(
			offset + AREA_INT_TRAJECTORY_KIND * 4,
			trajectory ? areaTrajectoryKindCode(trajectory.kind) : 0,
			true,
		);
		this.data.setInt32(offset + AREA_INT_ID_HASH * 4, area ? worldStateStringId(area.id) : 0, true);
		this.data.setInt32(offset + AREA_INT_RESERVED * 4, 0, true);

		const shape = area?.shape;
		const floats = new Float64Array(AREA_FLOAT_FIELDS);
		floats[AREA_FLOAT_SPAWN_TIME] = area?.spawnTimeMs ?? 0;
		if (trajectory) {
			switch (trajectory.kind) {
				case "static":
					floats[AREA_FLOAT_A_X] = trajectory.center.x;
					floats[AREA_FLOAT_A_Y] = trajectory.center.y;
					floats[AREA_FLOAT_A_Z] = trajectory.center.z;
					floats[AREA_FLOAT_S0] = trajectory.lifetimeMs;
					break;
				case "attach":
					floats[AREA_FLOAT_A_X] = trajectory.offset.x;
					floats[AREA_FLOAT_A_Y] = trajectory.offset.y;
					floats[AREA_FLOAT_A_Z] = trajectory.offset.z;
					floats[AREA_FLOAT_S0] = trajectory.lifetimeMs;
					break;
				case "segment":
					floats[AREA_FLOAT_A_X] = trajectory.from.x;
					floats[AREA_FLOAT_A_Y] = trajectory.from.y;
					floats[AREA_FLOAT_A_Z] = trajectory.from.z;
					floats[AREA_FLOAT_B_X] = trajectory.to.x;
					floats[AREA_FLOAT_B_Y] = trajectory.to.y;
					floats[AREA_FLOAT_B_Z] = trajectory.to.z;
					floats[AREA_FLOAT_S0] = trajectory.speed;
					break;
				case "ray":
					floats[AREA_FLOAT_A_X] = trajectory.from.x;
					floats[AREA_FLOAT_A_Y] = trajectory.from.y;
					floats[AREA_FLOAT_A_Z] = trajectory.from.z;
					floats[AREA_FLOAT_B_X] = trajectory.dir.x;
					floats[AREA_FLOAT_B_Y] = trajectory.dir.y;
					floats[AREA_FLOAT_B_Z] = trajectory.dir.z;
					floats[AREA_FLOAT_S0] = trajectory.speed;
					floats[AREA_FLOAT_S1] = trajectory.maxDistance;
					break;
				case "arc":
					floats[AREA_FLOAT_A_X] = trajectory.center.x;
					floats[AREA_FLOAT_A_Y] = trajectory.center.y;
					floats[AREA_FLOAT_A_Z] = trajectory.center.z;
					floats[AREA_FLOAT_B_X] = trajectory.normal.x;
					floats[AREA_FLOAT_B_Y] = trajectory.normal.y;
					floats[AREA_FLOAT_B_Z] = trajectory.normal.z;
					floats[AREA_FLOAT_S0] = trajectory.radius;
					floats[AREA_FLOAT_S1] = trajectory.startAngle;
					floats[AREA_FLOAT_S2] = trajectory.endAngle;
					floats[AREA_FLOAT_S3] = trajectory.speed;
					break;
				case "spiral":
					floats[AREA_FLOAT_A_X] = trajectory.center.x;
					floats[AREA_FLOAT_A_Y] = trajectory.center.y;
					floats[AREA_FLOAT_A_Z] = trajectory.center.z;
					floats[AREA_FLOAT_B_X] = trajectory.normal.x;
					floats[AREA_FLOAT_B_Y] = trajectory.normal.y;
					floats[AREA_FLOAT_B_Z] = trajectory.normal.z;
					floats[AREA_FLOAT_S0] = trajectory.startAngle;
					floats[AREA_FLOAT_S1] = trajectory.startRadius;
					floats[AREA_FLOAT_S2] = trajectory.endRadius;
					floats[AREA_FLOAT_S3] = trajectory.radiusGrowthPerRadian;
					floats[AREA_FLOAT_S4] = trajectory.speed;
					break;
			}
		}
		floats[AREA_FLOAT_SHAPE_RADIUS] = shape?.radius ?? 0;
		floats[AREA_FLOAT_SHAPE_WIDTH] = shape?.width ?? 0;
		floats[AREA_FLOAT_SHAPE_HEIGHT] = shape?.height ?? 0;
		for (let field = 0; field < AREA_FLOAT_FIELDS; field++)
			this.data.setFloat64(offset + AREA_INT_FIELDS * 4 + field * 8, floats[field] ?? 0, true);
	}
}

function emptyMember(layout: WorldStateMemberLayout): WorldStateMember {
	return {
		entityIdHash: 0,
		active: false,
		generation: 0,
		entityType: layout.entityType,
		visualProfileId: layout.visualProfileId,
		position: { x: 0, y: 0, z: 0 },
		yaw: 0,
		speed: 0,
		stateFlags: 0,
		state: { id: 0, instance: 0, startedAtLogicalTimeMs: 0 },
		attributes: Array.from({ length: layout.attributeCount }, () => ({ base: 0, act: 0 })),
		modifiers: [],
	};
}

export class WorldStateReader {
	private readonly header: Int32Array;
	private readonly data: DataView;
	private readonly descriptor: WorldStateLayoutDescriptor;
	private readonly memberOffsets: ReturnType<typeof offsets>;
	private readStats: WorldStateReadStats = { reads: 0, retries: 0, nullReturns: 0 };
	readonly memberCount: number;
	readonly areaCapacity: number;

	constructor(buffer: SharedArrayBuffer, descriptor: WorldStateLayoutDescriptor) {
		const header = readHeader(buffer);
		validateDescriptor(descriptor);
		if (
			buffer.byteLength !== descriptor.byteLength ||
			header.memberCapacity !== descriptor.memberCapacity ||
			header.areaCapacity !== descriptor.areaCapacity ||
			header.attributeCount !== descriptor.attributeSchema.length ||
			header.modifierSourceCapacity !== descriptor.modifierSourceCapacity ||
			header.modifierChainCapacity !== descriptor.modifierChainCapacity
		) {
			throw new WorldStateProtocolError(
				WORLD_STATE_ERROR_CODES.LAYOUT_SIZE_MISMATCH,
				"实时世界状态 SAB 与布局描述符不匹配",
			);
		}
		this.header = header.header;
		this.data = new DataView(buffer);
		this.descriptor = descriptor;
		this.memberOffsets = offsets(descriptor);
		this.memberCount = descriptor.memberCapacity;
		this.areaCapacity = descriptor.areaCapacity;
	}

	getLayout(): WorldStateLayoutDescriptor {
		return this.descriptor;
	}
	getCommitVersion(): number {
		return Atomics.load(this.header, HDR_COMMIT_VERSION);
	}

	/** 读取诊断统计：readLatest 调用次数、seqlock 重试次数、null 返回次数。 */
	getReadStats(): WorldStateReadStats {
		return { ...this.readStats };
	}

	resetReadStats(): void {
		this.readStats = { reads: 0, retries: 0, nullReturns: 0 };
	}

	/** 读取一个完整稳定提交，禁止成员、区域分表读取造成跨提交混合。 */
	readLatest(): WorldStateSnapshot | null {
		this.readStats.reads += 1;
		for (let retry = 0; retry < MAX_SEQLOCK_RETRIES; retry++) {
			if (retry > 0) this.readStats.retries += 1;
			const first = Atomics.load(this.header, HDR_COMMIT_VERSION);
			if (first & 1) continue;
			const sourceCount = Atomics.load(this.header, HDR_SOURCE_COUNT);
			const chainCount = Atomics.load(this.header, HDR_CHAIN_COUNT);
			if (
				sourceCount < 0 ||
				sourceCount > this.descriptor.modifierSourceCapacity ||
				chainCount < 0 ||
				chainCount > this.descriptor.modifierChainCapacity
			)
				continue;
			const logicalTimeMs = this.data.getFloat64(HDR_FLOAT_LOGICAL_TIME_MS, true);
			const members = this.readMembers();
			const areas = this.readAreas();
			for (const area of areas) {
				if (!area.active) continue;
				const sourcePos = members[area.sourceMemberIndex]?.position ?? { x: 0, y: 0, z: 0 };
				const targetPos = members[area.targetMemberIndex]?.position ?? sourcePos;
				area.position = evalTrajectory(area.trajectory, Math.max(0, logicalTimeMs - area.spawnTimeMs), {
					source: sourcePos,
					target: targetPos,
				});
			}
			const snapshot: WorldStateSnapshot = {
				commitVersion: first,
				logicalTimeMs,
				tickIndex: Atomics.load(this.header, HDR_TICK_INDEX),
				clock: {
					state: decodeClockState(Atomics.load(this.header, HDR_CLOCK_STATE)),
					revision: Atomics.load(this.header, HDR_CLOCK_REVISION),
					sampledAtEpochMs: this.data.getFloat64(HDR_FLOAT_CLOCK_SAMPLED_AT_EPOCH_MS, true),
					timelineTimeMs: this.data.getFloat64(HDR_FLOAT_CLOCK_TIMELINE_TIME_MS, true),
					timeScale: this.data.getFloat64(HDR_FLOAT_CLOCK_TIME_SCALE, true),
					fixedStepMs: this.data.getFloat64(HDR_FLOAT_CLOCK_FIXED_STEP_MS, true),
				},
				members,
				areas,
				modifierSources: this.readModifierSources(sourceCount),
				modifierChains: this.readModifierChains(chainCount),
			};
			const second = Atomics.load(this.header, HDR_COMMIT_VERSION);
			if (first === second) return snapshot;
		}
		this.readStats.nullReturns += 1;
		return null;
	}

	private readMembers(): WorldStateMember[] {
		return this.descriptor.memberDirectory.map((layout, slot) => {
			const directory = this.memberOffsets.directoryOffset + slot * DIRECTORY_BYTES;
			const state = this.memberOffsets.stateOffset + slot * STATE_BYTES;
			const member = emptyMember(layout);
			member.active = this.data.getInt32(directory + DIR_ACTIVE * 4, true) !== 0;
			member.entityIdHash = this.data.getInt32(directory + DIR_ENTITY_ID_HASH * 4, true);
			member.generation = this.data.getInt32(directory + DIR_GENERATION * 4, true);
			member.entityType = this.data.getInt32(directory + DIR_ENTITY_TYPE * 4, true) as WorldStateEntityType;
			member.visualProfileId = this.data.getInt32(directory + DIR_VISUAL_PROFILE * 4, true);
			member.stateFlags = this.data.getInt32(state + STATE_INT_FLAGS * 4, true);
			member.state.id = this.data.getInt32(state + STATE_INT_STATE_ID * 4, true);
			member.state.instance = this.data.getInt32(state + STATE_INT_STATE_INSTANCE * 4, true);
			const floats = Array.from({ length: STATE_FLOAT_FIELDS }, (_, index) =>
				this.data.getFloat64(state + STATE_INT_FIELDS * 4 + index * 8, true),
			);
			member.position = { x: floats[STATE_FLOAT_X], y: floats[STATE_FLOAT_Y], z: floats[STATE_FLOAT_Z] };
			member.yaw = floats[STATE_FLOAT_YAW];
			member.speed = floats[STATE_FLOAT_SPEED];
			member.state.startedAtLogicalTimeMs = floats[STATE_FLOAT_STATE_STARTED_AT];

			for (let index = 0; index < layout.attributeCount; index++) {
				const offset = this.memberOffsets.attributeOffset + (layout.attributeOffset + index) * ATTRIBUTE_BYTES;
				member.attributes[index] = {
					base: this.data.getFloat64(offset, true),
					act: this.data.getFloat64(offset + 8, true),
				};
			}
			for (let index = 0; index < layout.modifierCapacity; index++) {
				const offset = this.memberOffsets.modifierOffset + (layout.modifierOffset + index) * MODIFIER_BYTES;
				const attributeIndex = this.data.getInt32(offset + MODIFIER_INT_ATTRIBUTE * 4, true);
				if (attributeIndex < 0) continue;
				member.modifiers.push({
					attributeIndex,
					type: this.data.getInt32(offset + MODIFIER_INT_TYPE * 4, true),
					sourceIndex: this.data.getInt32(offset + MODIFIER_INT_SOURCE * 4, true),
					chainIndex: this.data.getInt32(offset + MODIFIER_INT_CHAIN * 4, true),
					value: this.data.getFloat64(offset + MODIFIER_INT_FIELDS * 4, true),
				});
			}
			return member;
		});
	}

	private readAreas(): WorldStateArea[] {
		const result: WorldStateArea[] = [];
		const floats = new Float64Array(AREA_FLOAT_FIELDS);
		for (let index = 0; index < this.descriptor.areaCapacity; index++) {
			const offset = this.memberOffsets.areaOffset + index * AREA_BYTES;
			const active = this.data.getInt32(offset + AREA_INT_ACTIVE * 4, true) !== 0;
			if (!active) {
				result.push({
					idHash: this.data.getInt32(offset + AREA_INT_ID_HASH * 4, true),
					active: false,
					generation: this.data.getInt32(offset + AREA_INT_GENERATION * 4, true),
					type: this.data.getInt32(offset + AREA_INT_TYPE * 4, true),
					position: { x: 0, y: 0, z: 0 },
					shape: {
						kind: this.data.getInt32(offset + AREA_INT_SHAPE * 4, true),
						radius: 0,
						width: 0,
						height: 0,
					},
					spawnTimeMs: 0,
					trajectory: { kind: "static", center: { x: 0, y: 0, z: 0 }, lifetimeMs: 0 },
					sourceMemberIndex: -1,
					targetMemberIndex: -1,
					anchorMemberIndex: -1,
				});
				continue;
			}
			const sourceMemberIndex = this.data.getInt32(offset + AREA_INT_SOURCE_MEMBER * 4, true);
			const targetMemberIndex = this.data.getInt32(offset + AREA_INT_TARGET_MEMBER * 4, true);
			const anchorMemberIndex = this.data.getInt32(offset + AREA_INT_ANCHOR_MEMBER * 4, true);
			for (let field = 0; field < AREA_FLOAT_FIELDS; field++) {
				floats[field] = this.data.getFloat64(offset + AREA_INT_FIELDS * 4 + field * 8, true);
			}
			const trajectory = decodeAreaTrajectory(this.data.getInt32(offset + AREA_INT_TRAJECTORY_KIND * 4, true), floats);
			if (trajectory.kind === "attach" && anchorMemberIndex >= 0 && anchorMemberIndex === targetMemberIndex) {
				trajectory.anchor = "target";
			}
			result.push({
				idHash: this.data.getInt32(offset + AREA_INT_ID_HASH * 4, true),
				active,
				generation: this.data.getInt32(offset + AREA_INT_GENERATION * 4, true),
				type: this.data.getInt32(offset + AREA_INT_TYPE * 4, true),
				position: { x: 0, y: 0, z: 0 },
				shape: {
					kind: this.data.getInt32(offset + AREA_INT_SHAPE * 4, true),
					radius: floats[AREA_FLOAT_SHAPE_RADIUS],
					width: floats[AREA_FLOAT_SHAPE_WIDTH],
					height: floats[AREA_FLOAT_SHAPE_HEIGHT],
				},
				spawnTimeMs: floats[AREA_FLOAT_SPAWN_TIME],
				trajectory,
				sourceMemberIndex,
				targetMemberIndex,
				anchorMemberIndex,
			});
		}
		return result;
	}

	private readModifierSources(count: number): WorldStateModifierSource[] {
		return Array.from({ length: count }, (_, index) => {
			const offset = this.memberOffsets.modifierSourceOffset + index * SOURCE_BYTES;
			return { idHash: this.data.getInt32(offset, true), type: this.data.getInt32(offset + 4, true) };
		});
	}

	private readModifierChains(count: number): WorldStateModifierChain[] {
		return Array.from({ length: count }, (_, index) => {
			const offset = this.memberOffsets.modifierChainOffset + index * CHAIN_BYTES;
			return {
				sourceIndex: this.data.getInt32(offset, true),
				parentIndex: this.data.getInt32(offset + 4, true),
			};
		});
	}
}
