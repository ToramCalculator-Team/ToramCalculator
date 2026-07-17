import { MEMBER_TYPE, type MemberType } from "@db/schema/enums";
import { z } from "zod/v4";
import type {
	AttributeSnapshot,
	ModifierSource,
	StatIndexedReadSource,
} from "./World/Member/runtime/StatContainer/StatContainerTypes";
import { ModifierSourceSchema, ModifierType } from "./World/Member/runtime/StatContainer/StatContainerTypes";

export const TICK_STATE_HISTORY_LAYOUT_VERSION: 1 = 1;

const SEGMENT_MAGIC = 0x54414831;
const SEGMENT_HEADER_BYTES = 32;
const TICK_RECORD_HEADER_BYTES = 24;
const MEMBER_RECORD_BYTES = 32;
const DEFAULT_SEGMENT_BYTES = 1024 * 1024;
const SEGMENT_STATE_OFFSET = 8;
const SEGMENT_STATE_OPEN = 0;
const SEGMENT_STATE_SEALED = 1;

const BASE_VALUE_CHANGED = 1 << 0;
const ACT_VALUE_CHANGED = 1 << 1;
const MODIFIER_FLAG_OFFSET = 2;
const ALL_ATTRIBUTE_FLAGS = (1 << (MODIFIER_FLAG_OFFSET + ModifierType.MODIFIER_ARRAYS_COUNT)) - 1;

const STATE_HISTORY_MODIFIER_TYPES: readonly ModifierType[] = Object.freeze([
	ModifierType.BASE_VALUE,
	ModifierType.STATIC_FIXED,
	ModifierType.STATIC_PERCENTAGE,
	ModifierType.DYNAMIC_FIXED,
	ModifierType.DYNAMIC_PERCENTAGE,
]);

const SharedArrayBufferSchema = z.custom<SharedArrayBuffer>(
	(value) => typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer,
	{ message: "Tick 状态历史分段必须由 SharedArrayBuffer 承载" },
);

export const TickStateAttributeDescriptorSchema = z.object({
	path: z.string().min(1),
	displayName: z.string(),
	expression: z.string(),
});

export const TickStateMemberDescriptorSchema = z.object({
	id: z.string().min(1),
	type: z.enum(MEMBER_TYPE),
	name: z.string(),
	campId: z.string(),
	teamId: z.string(),
	attributes: z.array(TickStateAttributeDescriptorSchema),
});

export const TickStateSegmentDescriptorSchema = z.object({
	startTick: z.number().int().nonnegative(),
	tickCount: z.number().int().positive(),
	usedByteLength: z.number().int().min(SEGMENT_HEADER_BYTES),
	buffer: SharedArrayBufferSchema,
});

const TickStateHistoryDirectoryShapeSchema = z.object({
	layoutVersion: z.literal(TICK_STATE_HISTORY_LAYOUT_VERSION),
	tickCount: z.number().int().nonnegative(),
	members: z.array(TickStateMemberDescriptorSchema),
	modifierSources: z.array(ModifierSourceSchema),
	segments: z.array(TickStateSegmentDescriptorSchema),
});

export type TickStateAttributeDescriptor = z.output<typeof TickStateAttributeDescriptorSchema>;
export type TickStateMemberDescriptor = z.output<typeof TickStateMemberDescriptorSchema>;
export type TickStateSegmentDescriptor = z.output<typeof TickStateSegmentDescriptorSchema>;
export type TickStateHistoryDirectory = z.output<typeof TickStateHistoryDirectoryShapeSchema>;

export interface TickStateMemberSource {
	readonly id: string;
	readonly type: MemberType;
	readonly name: string;
	readonly campId: string;
	readonly teamId: string;
	readonly position: { readonly x: number; readonly y: number; readonly z: number };
	readonly statContainer: StatIndexedReadSource;
}

export type TickStateMemberSnapshot = {
	id: string;
	type: MemberType;
	name: string;
	campId: string;
	teamId: string;
	position: { x: number; y: number; z: number };
	attrs: AttributeSnapshot;
};

export type TickStateSnapshot = {
	tickIndex: number;
	currentTimeMs: number;
	members: TickStateMemberSnapshot[];
};

export type TickStateHistoryDiagnostics = {
	tickCount: number;
	segmentCount: number;
	allocatedBytes: number;
	usedBytes: number;
	coveredTicks: number;
	allShared: boolean;
	continuous: boolean;
	samples: Array<{
		tickIndex: number;
		currentTimeMs: number;
		memberCount: number;
		memberSchemaMatches: boolean;
	}>;
};

type ModifierStateEntry = {
	sourceId: number;
	value: number;
};

type PreviousMemberState = {
	baseValues: Float64Array;
	actValues: Float64Array;
	modifierLists: Map<number, ModifierStateEntry[]>;
};

type OpenSegment = {
	buffer: SharedArrayBuffer;
	view: DataView;
	startTick: number;
	tickCount: number;
	writeOffset: number;
};

type MutableAttributeState = {
	baseValue: number | undefined;
	actValue: number | undefined;
	modifiers: ModifierStateEntry[][];
};

type MutableMemberState = {
	position: { x: number; y: number; z: number };
	attributes: MutableAttributeState[];
};

function cloneModifierSource(source: ModifierSource): ModifierSource {
	const [member, ...rest] = source.chain;
	return {
		...source,
		chain: [{ ...member }, ...rest.map((ref) => ({ ...ref }))],
	};
}

function modifierListKey(attributeIndex: number, type: ModifierType): number {
	return attributeIndex * ModifierType.MODIFIER_ARRAYS_COUNT + type;
}

function modifierFlag(type: ModifierType): number {
	return 1 << (MODIFIER_FLAG_OFFSET + type);
}

function normalizeNumber(value: number): number {
	return Number.isFinite(value) ? value : 0;
}

function alignedSegmentSize(requiredBytes: number): number {
	const target = Math.max(DEFAULT_SEGMENT_BYTES, requiredBytes);
	return Math.ceil(target / 4096) * 4096;
}

function segmentState(buffer: SharedArrayBuffer): Int32Array {
	return new Int32Array(buffer, SEGMENT_STATE_OFFSET, 1);
}

function initializeSegmentHeader(segment: OpenSegment): void {
	segment.view.setUint32(0, SEGMENT_MAGIC, true);
	segment.view.setUint32(4, TICK_STATE_HISTORY_LAYOUT_VERSION, true);
	Atomics.store(segmentState(segment.buffer), 0, SEGMENT_STATE_OPEN);
	segment.view.setUint32(16, SEGMENT_HEADER_BYTES, true);
	segment.view.setUint32(20, segment.startTick, true);
	segment.view.setUint32(24, 0, true);
}

function sealSegment(segment: OpenSegment): TickStateSegmentDescriptor {
	segment.view.setUint32(16, segment.writeOffset, true);
	segment.view.setUint32(24, segment.tickCount, true);
	Atomics.store(segmentState(segment.buffer), 0, SEGMENT_STATE_SEALED);
	return {
		startTick: segment.startTick,
		tickCount: segment.tickCount,
		usedByteLength: segment.writeOffset,
		buffer: segment.buffer,
	};
}

function addValidationIssue(ctx: z.RefinementCtx, message: string, path: PropertyKey[]): void {
	ctx.addIssue({ code: "custom", message, path });
}

function validateDirectoryHeaders(directory: TickStateHistoryDirectory, ctx: z.RefinementCtx): void {
	let expectedTick = 0;
	for (let index = 0; index < directory.segments.length; index++) {
		const segment = directory.segments[index];
		const path = ["segments", index];
		if (segment.startTick !== expectedTick) {
			addValidationIssue(ctx, `Tick 状态历史分段不连续: 期望 ${expectedTick}，收到 ${segment.startTick}`, path);
		}
		if (segment.usedByteLength > segment.buffer.byteLength) {
			addValidationIssue(ctx, "Tick 状态历史分段使用长度超过 SAB 容量", path);
			continue;
		}
		if (segment.buffer.byteLength < SEGMENT_HEADER_BYTES) {
			addValidationIssue(ctx, "Tick 状态历史分段小于头部长度", path);
			continue;
		}
		const view = new DataView(segment.buffer);
		if (view.getUint32(0, true) !== SEGMENT_MAGIC) addValidationIssue(ctx, "Tick 状态历史分段 magic 无效", path);
		if (view.getUint32(4, true) !== TICK_STATE_HISTORY_LAYOUT_VERSION) {
			addValidationIssue(ctx, "Tick 状态历史分段布局版本无效", path);
		}
		if (Atomics.load(segmentState(segment.buffer), 0) !== SEGMENT_STATE_SEALED) {
			addValidationIssue(ctx, "主线程收到未封闭的 Tick 状态历史分段", path);
		}
		if (view.getUint32(16, true) !== segment.usedByteLength) {
			addValidationIssue(ctx, "Tick 状态历史分段使用长度与目录不一致", path);
		}
		if (view.getUint32(20, true) !== segment.startTick || view.getUint32(24, true) !== segment.tickCount) {
			addValidationIssue(ctx, "Tick 状态历史分段覆盖范围与目录不一致", path);
		}
		expectedTick += segment.tickCount;
	}
	if (expectedTick !== directory.tickCount) {
		addValidationIssue(ctx, `Tick 状态历史目录总数不一致: 分段 ${expectedTick}，目录 ${directory.tickCount}`, [
			"tickCount",
		]);
	}
	if (directory.tickCount === 0 && directory.segments.length !== 0) {
		addValidationIssue(ctx, "空 Tick 状态历史目录不能包含分段", ["segments"]);
	}
}

export const TickStateHistoryDirectorySchema =
	TickStateHistoryDirectoryShapeSchema.superRefine(validateDirectoryHeaders);

/**
 * Worker 内唯一的 Tick 状态历史写入器。
 *
 * Writer 直接读取成员和 StatContainer 的稳定索引化状态，每段首 Tick 写完整基准，
 * 后续 Tick 只写变化。运行结束只封闭最后分段并返回目录，不重新扫描历史字节。
 */
export class TickStateHistoryWriter {
	private readonly members: TickStateMemberDescriptor[] = [];
	private readonly modifierSources: ModifierSource[] = [];
	private readonly modifierSourceIds = new WeakMap<object, number>();
	private readonly previousMembers: PreviousMemberState[] = [];
	private readonly segments: TickStateSegmentDescriptor[] = [];
	private openSegment: OpenSegment | null = null;
	private initialized = false;
	private tickCount = 0;
	private finishedDirectory: TickStateHistoryDirectory | null = null;
	private totalWriteDurationMs = 0;
	private maxWriteDurationMs = 0;

	constructor(
		private readonly startedAtTick: number,
		private readonly startedAtTimeMs: number,
		private readonly runId = "unidentified",
	) {}

	appendTick(tickIndex: number, currentTimeMs: number, sources: readonly TickStateMemberSource[]): void {
		const startedAt = performance.now();
		try {
			this.appendTickState(tickIndex, currentTimeMs, sources);
		} finally {
			const duration = performance.now() - startedAt;
			this.totalWriteDurationMs += duration;
			this.maxWriteDurationMs = Math.max(this.maxWriteDurationMs, duration);
		}
	}

	private appendTickState(tickIndex: number, currentTimeMs: number, sources: readonly TickStateMemberSource[]): void {
		if (this.finishedDirectory) throw new Error("Tick 状态历史已经封闭");
		const relativeTick = tickIndex - this.startedAtTick;
		const relativeTimeMs = currentTimeMs - this.startedAtTimeMs;
		if (relativeTick !== this.tickCount) {
			throw new Error(`Tick 状态历史不连续: 期望 ${this.tickCount}，收到 ${relativeTick}`);
		}
		if (!Number.isFinite(relativeTimeMs) || relativeTimeMs < 0) {
			throw new Error(`Tick 状态历史时间无效: ${relativeTimeMs}`);
		}

		if (!this.initialized) this.initializeSources(sources);
		this.assertStableMembers(sources);
		for (const source of sources) source.statContainer.prepareIndexedRead();

		let baseline = this.openSegment === null;
		let recordBytes = this.measureRecord(sources, baseline);
		if (this.openSegment && this.openSegment.writeOffset + recordBytes > this.openSegment.buffer.byteLength) {
			this.segments.push(sealSegment(this.openSegment));
			this.openSegment = null;
			baseline = true;
			recordBytes = this.measureRecord(sources, true);
		}
		if (!this.openSegment) this.openSegment = this.createSegment(relativeTick, recordBytes);
		this.writeRecord(this.openSegment, sources, relativeTick, relativeTimeMs, baseline, recordBytes);
		this.tickCount++;
	}

	finish(): TickStateHistoryDirectory {
		if (this.finishedDirectory) return this.finishedDirectory;
		const sealStartedAt = performance.now();
		if (this.openSegment) {
			this.segments.push(sealSegment(this.openSegment));
			this.openSegment = null;
		}
		const directory: TickStateHistoryDirectory = {
			layoutVersion: TICK_STATE_HISTORY_LAYOUT_VERSION,
			tickCount: this.tickCount,
			members: this.members,
			modifierSources: this.modifierSources,
			segments: this.segments,
		};
		this.finishedDirectory = directory;
		const detail = {
			runId: this.runId,
			tickCount: this.tickCount,
			segmentCount: this.segments.length,
			allocatedBytes: this.segments.reduce((total, segment) => total + segment.buffer.byteLength, 0),
			usedBytes: this.segments.reduce((total, segment) => total + segment.usedByteLength, 0),
			totalWriteDurationMs: this.totalWriteDurationMs,
			maxWriteDurationMs: this.maxWriteDurationMs,
			sealDurationMs: performance.now() - sealStartedAt,
		};
		performance.mark("engine:tick-state-history", { detail });
		if (import.meta.env.DEV && typeof document === "undefined" && typeof globalThis.postMessage === "function") {
			console.info("[Engine][TickStateHistoryWriter]", detail);
		}
		return directory;
	}

	private initializeSources(sources: readonly TickStateMemberSource[]): void {
		for (const source of sources) {
			const attributes: TickStateAttributeDescriptor[] = [];
			source.statContainer.visitAttributeSchema((index, path, displayName, expression) => {
				if (index !== attributes.length) throw new Error(`属性 Schema 索引不连续: ${index}`);
				attributes.push({ path, displayName, expression });
			});
			const attributeCount = source.statContainer.getAttributeCount();
			if (attributes.length !== attributeCount) throw new Error(`成员 ${source.id} 属性 Schema 数量不一致`);
			this.members.push({
				id: source.id,
				type: source.type,
				name: source.name,
				campId: source.campId,
				teamId: source.teamId,
				attributes,
			});
			this.previousMembers.push({
				baseValues: new Float64Array(attributeCount),
				actValues: new Float64Array(attributeCount),
				modifierLists: new Map(),
			});
		}
		this.initialized = true;
	}

	private assertStableMembers(sources: readonly TickStateMemberSource[]): void {
		if (sources.length !== this.members.length) throw new Error("运行期间成员数量发生变化");
		for (let index = 0; index < sources.length; index++) {
			const source = sources[index];
			const descriptor = this.members[index];
			if (source.id !== descriptor.id) throw new Error(`运行期间成员顺序发生变化: ${source.id}`);
			if (source.statContainer.getAttributeCount() !== descriptor.attributes.length) {
				throw new Error(`运行期间成员 ${source.id} 属性 Schema 发生变化`);
			}
		}
	}

	private measureRecord(sources: readonly TickStateMemberSource[], baseline: boolean): number {
		let bytes = TICK_RECORD_HEADER_BYTES + sources.length * MEMBER_RECORD_BYTES;
		for (let memberIndex = 0; memberIndex < sources.length; memberIndex++) {
			const source = sources[memberIndex].statContainer;
			const previous = this.previousMembers[memberIndex];
			for (let attributeIndex = 0; attributeIndex < source.getAttributeCount(); attributeIndex++) {
				const flags = this.attributeFlags(source, previous, attributeIndex, baseline);
				if (flags === 0) continue;
				bytes += 8;
				if ((flags & BASE_VALUE_CHANGED) !== 0) bytes += 8;
				if ((flags & ACT_VALUE_CHANGED) !== 0) bytes += 8;
				for (const type of STATE_HISTORY_MODIFIER_TYPES) {
					if ((flags & modifierFlag(type)) !== 0) {
						bytes += 4 + source.getModifierCountAt(attributeIndex, type) * 12;
					}
				}
			}
		}
		return bytes;
	}

	private attributeFlags(
		source: StatIndexedReadSource,
		previous: PreviousMemberState,
		attributeIndex: number,
		baseline: boolean,
	): number {
		if (baseline) return ALL_ATTRIBUTE_FLAGS;
		let flags = 0;
		const baseValue = normalizeNumber(source.getBaseValueAt(attributeIndex));
		const actValue = normalizeNumber(source.getValueAt(attributeIndex));
		if (!Object.is(baseValue, previous.baseValues[attributeIndex])) flags |= BASE_VALUE_CHANGED;
		if (!Object.is(actValue, previous.actValues[attributeIndex])) flags |= ACT_VALUE_CHANGED;
		for (const type of STATE_HISTORY_MODIFIER_TYPES) {
			if (this.modifierListChanged(source, previous, attributeIndex, type)) {
				flags |= modifierFlag(type);
			}
		}
		return flags;
	}

	private modifierListChanged(
		source: StatIndexedReadSource,
		previous: PreviousMemberState,
		attributeIndex: number,
		type: ModifierType,
	): boolean {
		const previousList = previous.modifierLists.get(modifierListKey(attributeIndex, type)) ?? [];
		if (source.getModifierCountAt(attributeIndex, type) !== previousList.length) return true;
		let cursor = 0;
		let changed = false;
		source.visitModifiersAt(attributeIndex, type, (modifierSource, value) => {
			const entry = previousList[cursor++];
			const sourceId = this.internModifierSource(modifierSource);
			if (!entry || entry.sourceId !== sourceId || !Object.is(entry.value, normalizeNumber(value))) changed = true;
		});
		return changed;
	}

	private internModifierSource(source: ModifierSource): number {
		const existing = this.modifierSourceIds.get(source);
		if (existing !== undefined) return existing;
		const id = this.modifierSources.length;
		this.modifierSources.push(cloneModifierSource(source));
		this.modifierSourceIds.set(source, id);
		return id;
	}

	private createSegment(startTick: number, recordBytes: number): OpenSegment {
		const buffer = new SharedArrayBuffer(alignedSegmentSize(SEGMENT_HEADER_BYTES + recordBytes));
		const segment: OpenSegment = {
			buffer,
			view: new DataView(buffer),
			startTick,
			tickCount: 0,
			writeOffset: SEGMENT_HEADER_BYTES,
		};
		initializeSegmentHeader(segment);
		return segment;
	}

	private writeRecord(
		segment: OpenSegment,
		sources: readonly TickStateMemberSource[],
		tickIndex: number,
		currentTimeMs: number,
		baseline: boolean,
		recordBytes: number,
	): void {
		const recordStart = segment.writeOffset;
		let cursor = recordStart;
		segment.view.setUint32(cursor, recordBytes, true);
		cursor += 4;
		segment.view.setUint32(cursor, tickIndex, true);
		cursor += 4;
		segment.view.setFloat64(cursor, currentTimeMs, true);
		cursor += 8;
		segment.view.setUint32(cursor, sources.length, true);
		cursor += 4;
		segment.view.setUint32(cursor, baseline ? 1 : 0, true);
		cursor += 4;

		for (let memberIndex = 0; memberIndex < sources.length; memberIndex++) {
			const member = sources[memberIndex];
			const source = member.statContainer;
			const previous = this.previousMembers[memberIndex];
			segment.view.setUint32(cursor, memberIndex, true);
			cursor += 4;
			segment.view.setFloat64(cursor, normalizeNumber(member.position.x), true);
			cursor += 8;
			segment.view.setFloat64(cursor, normalizeNumber(member.position.y), true);
			cursor += 8;
			segment.view.setFloat64(cursor, normalizeNumber(member.position.z), true);
			cursor += 8;

			const attributeCountOffset = cursor;
			cursor += 4;
			let changedAttributeCount = 0;
			for (let attributeIndex = 0; attributeIndex < source.getAttributeCount(); attributeIndex++) {
				const flags = this.attributeFlags(source, previous, attributeIndex, baseline);
				if (flags === 0) continue;
				changedAttributeCount++;
				segment.view.setUint32(cursor, attributeIndex, true);
				cursor += 4;
				segment.view.setUint32(cursor, flags, true);
				cursor += 4;

				if ((flags & BASE_VALUE_CHANGED) !== 0) {
					const value = normalizeNumber(source.getBaseValueAt(attributeIndex));
					segment.view.setFloat64(cursor, value, true);
					cursor += 8;
					previous.baseValues[attributeIndex] = value;
				}
				if ((flags & ACT_VALUE_CHANGED) !== 0) {
					const value = normalizeNumber(source.getValueAt(attributeIndex));
					segment.view.setFloat64(cursor, value, true);
					cursor += 8;
					previous.actValues[attributeIndex] = value;
				}

				for (const type of STATE_HISTORY_MODIFIER_TYPES) {
					if ((flags & modifierFlag(type)) === 0) continue;
					const count = source.getModifierCountAt(attributeIndex, type);
					segment.view.setUint32(cursor, count, true);
					cursor += 4;
					const nextList: ModifierStateEntry[] = [];
					source.visitModifiersAt(attributeIndex, type, (modifierSource, rawValue) => {
						const sourceId = this.internModifierSource(modifierSource);
						const value = normalizeNumber(rawValue);
						segment.view.setUint32(cursor, sourceId, true);
						cursor += 4;
						segment.view.setFloat64(cursor, value, true);
						cursor += 8;
						nextList.push({ sourceId, value });
					});
					const key = modifierListKey(attributeIndex, type);
					if (nextList.length === 0) previous.modifierLists.delete(key);
					else previous.modifierLists.set(key, nextList);
				}
			}
			segment.view.setUint32(attributeCountOffset, changedAttributeCount, true);
		}

		if (cursor - recordStart !== recordBytes) {
			throw new Error(`Tick 状态历史记录长度不一致: 预计 ${recordBytes}，写入 ${cursor - recordStart}`);
		}
		segment.writeOffset = cursor;
		segment.tickCount++;
	}
}

function createMutableMembers(directory: TickStateHistoryDirectory): MutableMemberState[] {
	return directory.members.map((member) => ({
		position: { x: 0, y: 0, z: 0 },
		attributes: member.attributes.map(() => ({
			baseValue: undefined,
			actValue: undefined,
			modifiers: STATE_HISTORY_MODIFIER_TYPES.map(() => []),
		})),
	}));
}

function requireReadable(cursor: number, bytes: number, end: number): void {
	if (cursor + bytes > end) throw new Error("Tick 状态历史分段记录越界");
}

function applyModifierList(
	view: DataView,
	cursor: number,
	recordEnd: number,
	directory: TickStateHistoryDirectory,
): { cursor: number; entries: ModifierStateEntry[] } {
	requireReadable(cursor, 4, recordEnd);
	const count = view.getUint32(cursor, true);
	cursor += 4;
	const entries: ModifierStateEntry[] = [];
	for (let index = 0; index < count; index++) {
		requireReadable(cursor, 12, recordEnd);
		const sourceId = view.getUint32(cursor, true);
		cursor += 4;
		const value = view.getFloat64(cursor, true);
		cursor += 8;
		if (!directory.modifierSources[sourceId]) throw new Error(`Tick 状态历史 modifier 来源越界: ${sourceId}`);
		entries.push({ sourceId, value });
	}
	return { cursor, entries };
}

function materializeSnapshot(
	directory: TickStateHistoryDirectory,
	state: MutableMemberState[],
	tickIndex: number,
	currentTimeMs: number,
): TickStateSnapshot {
	const members = directory.members.map((descriptor, memberIndex): TickStateMemberSnapshot => {
		const memberState = state[memberIndex];
		const attrs: AttributeSnapshot = {};
		for (let attributeIndex = 0; attributeIndex < descriptor.attributes.length; attributeIndex++) {
			const attribute = descriptor.attributes[attributeIndex];
			const valueState = memberState.attributes[attributeIndex];
			if (valueState.baseValue === undefined || valueState.actValue === undefined) {
				throw new Error(`Tick 状态历史基准缺少属性 ${descriptor.id}:${attribute.path}`);
			}
			const entries = (type: ModifierType) =>
				valueState.modifiers[type].map((entry) => ({
					value: entry.value,
					source: cloneModifierSource(directory.modifierSources[entry.sourceId]),
				}));
			attrs[attribute.path] = {
				displayName: attribute.displayName,
				expression: attribute.expression,
				baseValue: valueState.baseValue,
				baseSources: entries(ModifierType.BASE_VALUE),
				actValue: valueState.actValue,
				static: {
					fixed: entries(ModifierType.STATIC_FIXED),
					percentage: entries(ModifierType.STATIC_PERCENTAGE),
				},
				dynamic: {
					fixed: entries(ModifierType.DYNAMIC_FIXED),
					percentage: entries(ModifierType.DYNAMIC_PERCENTAGE),
				},
			};
		}
		return {
			id: descriptor.id,
			type: descriptor.type,
			name: descriptor.name,
			campId: descriptor.campId,
			teamId: descriptor.teamId,
			position: { ...memberState.position },
			attrs,
		};
	});
	return { tickIndex, currentTimeMs, members };
}

function decodeSegmentRange(
	directory: TickStateHistoryDirectory,
	segment: TickStateSegmentDescriptor,
	startTick: number,
	endTickExclusive: number,
): TickStateSnapshot[] {
	const state = createMutableMembers(directory);
	const view = new DataView(segment.buffer, 0, segment.usedByteLength);
	const snapshots: TickStateSnapshot[] = [];
	let cursor = SEGMENT_HEADER_BYTES;
	for (let recordIndex = 0; recordIndex < segment.tickCount; recordIndex++) {
		requireReadable(cursor, TICK_RECORD_HEADER_BYTES, segment.usedByteLength);
		const recordStart = cursor;
		const recordBytes = view.getUint32(cursor, true);
		cursor += 4;
		const recordEnd = recordStart + recordBytes;
		if (recordBytes < TICK_RECORD_HEADER_BYTES || recordEnd > segment.usedByteLength) {
			throw new Error("Tick 状态历史记录长度无效");
		}
		const tickIndex = view.getUint32(cursor, true);
		cursor += 4;
		const expectedTick = segment.startTick + recordIndex;
		if (tickIndex !== expectedTick) throw new Error(`Tick 状态历史记录不连续: 期望 ${expectedTick}，收到 ${tickIndex}`);
		const currentTimeMs = view.getFloat64(cursor, true);
		cursor += 8;
		const memberCount = view.getUint32(cursor, true);
		cursor += 4;
		const baseline = view.getUint32(cursor, true) === 1;
		cursor += 4;
		if (memberCount !== directory.members.length) throw new Error("Tick 状态历史成员数量与目录不一致");
		if (recordIndex === 0 && !baseline) throw new Error("Tick 状态历史分段首记录不是完整基准");

		for (let memberIndex = 0; memberIndex < memberCount; memberIndex++) {
			requireReadable(cursor, MEMBER_RECORD_BYTES, recordEnd);
			const encodedMemberIndex = view.getUint32(cursor, true);
			cursor += 4;
			if (encodedMemberIndex !== memberIndex) throw new Error("Tick 状态历史成员顺序无效");
			const memberState = state[memberIndex];
			memberState.position.x = view.getFloat64(cursor, true);
			cursor += 8;
			memberState.position.y = view.getFloat64(cursor, true);
			cursor += 8;
			memberState.position.z = view.getFloat64(cursor, true);
			cursor += 8;
			const attributeCount = view.getUint32(cursor, true);
			cursor += 4;
			if (baseline && attributeCount !== memberState.attributes.length) {
				throw new Error("Tick 状态历史基准属性数量不完整");
			}
			let previousAttributeIndex = -1;
			for (let changeIndex = 0; changeIndex < attributeCount; changeIndex++) {
				requireReadable(cursor, 8, recordEnd);
				const attributeIndex = view.getUint32(cursor, true);
				cursor += 4;
				const flags = view.getUint32(cursor, true);
				cursor += 4;
				if (attributeIndex <= previousAttributeIndex || attributeIndex >= memberState.attributes.length) {
					throw new Error("Tick 状态历史属性索引无效");
				}
				if (baseline && flags !== ALL_ATTRIBUTE_FLAGS) throw new Error("Tick 状态历史基准属性字段不完整");
				if ((flags & ~ALL_ATTRIBUTE_FLAGS) !== 0) throw new Error("Tick 状态历史属性 flags 无效");
				previousAttributeIndex = attributeIndex;
				const attributeState = memberState.attributes[attributeIndex];
				if ((flags & BASE_VALUE_CHANGED) !== 0) {
					requireReadable(cursor, 8, recordEnd);
					attributeState.baseValue = view.getFloat64(cursor, true);
					cursor += 8;
				}
				if ((flags & ACT_VALUE_CHANGED) !== 0) {
					requireReadable(cursor, 8, recordEnd);
					attributeState.actValue = view.getFloat64(cursor, true);
					cursor += 8;
				}
				for (const type of STATE_HISTORY_MODIFIER_TYPES) {
					if ((flags & modifierFlag(type)) === 0) continue;
					const decoded = applyModifierList(view, cursor, recordEnd, directory);
					cursor = decoded.cursor;
					attributeState.modifiers[type] = decoded.entries;
				}
			}
		}

		if (cursor !== recordEnd) throw new Error("Tick 状态历史记录包含无法解释的尾部字节");
		if (tickIndex >= startTick && tickIndex < endTickExclusive) {
			snapshots.push(materializeSnapshot(directory, state, tickIndex, currentTimeMs));
		}
		if (tickIndex + 1 >= endTickExclusive) break;
	}
	return snapshots;
}

/** 从已验证目录按需还原一个 Tick；不会验证或遍历其他分段。 */
export function readTickStateSnapshot(directory: TickStateHistoryDirectory, tickIndex: number): TickStateSnapshot {
	if (!Number.isInteger(tickIndex) || tickIndex < 0 || tickIndex >= directory.tickCount) {
		throw new Error(`Tick 状态历史索引越界: ${tickIndex}`);
	}
	const segment = directory.segments.find(
		(candidate) => tickIndex >= candidate.startTick && tickIndex < candidate.startTick + candidate.tickCount,
	);
	if (!segment) throw new Error(`Tick 状态历史目录缺少 Tick ${tickIndex}`);
	const snapshot = decodeSegmentRange(directory, segment, tickIndex, tickIndex + 1)[0];
	if (!snapshot) throw new Error(`Tick 状态历史分段无法还原 Tick ${tickIndex}`);
	return snapshot;
}

/** 按区间逐段解码；不会把区间外历史物化为对象。 */
export function readTickStateRange(
	directory: TickStateHistoryDirectory,
	startTick: number,
	endTickExclusive: number,
): TickStateSnapshot[] {
	if (!Number.isInteger(startTick) || !Number.isInteger(endTickExclusive))
		throw new Error("Tick 状态历史区间必须是整数");
	if (startTick < 0 || endTickExclusive < startTick || endTickExclusive > directory.tickCount) {
		throw new Error(`Tick 状态历史区间越界: [${startTick}, ${endTickExclusive})`);
	}
	const snapshots: TickStateSnapshot[] = [];
	for (const segment of directory.segments) {
		const segmentEnd = segment.startTick + segment.tickCount;
		if (segmentEnd <= startTick || segment.startTick >= endTickExclusive) continue;
		snapshots.push(...decodeSegmentRange(directory, segment, startTick, endTickExclusive));
	}
	return snapshots;
}

/**
 * 为浏览器验收生成小型只读诊断结果。
 *
 * 只解码每个分段的首 Tick 和整条记录的末 Tick，既验证每段基准可独立读取，
 * 又避免为了日志把完整历史物化为对象数组。
 */
export function collectTickStateHistoryDiagnostics(directory: TickStateHistoryDirectory): TickStateHistoryDiagnostics {
	const sampleTicks = new Set<number>();
	if (directory.tickCount > 0) {
		sampleTicks.add(0);
		sampleTicks.add(directory.tickCount - 1);
		for (const segment of directory.segments) sampleTicks.add(segment.startTick);
	}

	let expectedTick = 0;
	let coveredTicks = 0;
	let continuous = true;
	for (const segment of directory.segments) {
		if (segment.startTick !== expectedTick) continuous = false;
		expectedTick = segment.startTick + segment.tickCount;
		coveredTicks += segment.tickCount;
	}

	return {
		tickCount: directory.tickCount,
		segmentCount: directory.segments.length,
		allocatedBytes: directory.segments.reduce((total, segment) => total + segment.buffer.byteLength, 0),
		usedBytes: directory.segments.reduce((total, segment) => total + segment.usedByteLength, 0),
		coveredTicks,
		allShared: directory.segments.every((segment) => segment.buffer instanceof SharedArrayBuffer),
		continuous: continuous && coveredTicks === directory.tickCount,
		samples: [...sampleTicks]
			.sort((left, right) => left - right)
			.map((tickIndex) => {
				const snapshot = readTickStateSnapshot(directory, tickIndex);
				return {
					tickIndex: snapshot.tickIndex,
					currentTimeMs: snapshot.currentTimeMs,
					memberCount: snapshot.members.length,
					memberSchemaMatches:
						snapshot.members.length === directory.members.length &&
						snapshot.members.every((member, memberIndex) => {
							const descriptor = directory.members[memberIndex];
							return (
								descriptor !== undefined &&
								member.id === descriptor.id &&
								Object.keys(member.attrs).length === descriptor.attributes.length
							);
						}),
				};
			}),
	};
}
