/**
 * SAB 世界状态缓冲区（World State Buffer）。
 *
 * 用于 Worker（引擎）与主线程（渲染层）之间高频共享成员位置/朝向，
 * 替代 postMessage reconcile 消息流。
 *
 * 协议设计：
 * - 实时 Session 在场景加载后显式创建 SAB，通过 RPC 附加给 Worker。
 * - Worker 每 tick 末以 seqlock 写入所有成员位置/yaw。
 * - 渲染端每帧以 seqlock 读取，失败时重试（写入冲突极短，一般 0-1 次重试）。
 * - 渲染端维护"渲染位置"，每帧 lerp 向权威位置（指数平滑），消除 tick 间隙抖动。
 *
 * 内存布局（全 SAB 大小 = HEADER_BYTES + memberCount * SLOT_BYTES）：
 *   [Int32 ×4]  header: magic, layoutVersion, memberCount, seqVersion（Atomics seqlock）
 *   [Float32 ×6 per member]  pos.x, pos.y, pos.z, yaw, speed, stateFlags
 *
 * seqlock 约定：
 *   - 偶数 = 稳定（可读）；奇数 = 写入中（不可读）。
 *   - 写：Atomics.add(seqArr, SEQ_IDX, 1) → 写数据 → Atomics.add(seqArr, SEQ_IDX, 1)
 *   - 读：v1=load; if odd→retry; readData; v2=load; if v1!==v2→retry
 *
 * stateFlags（Float32 视为 Uint32 位域）：
 *   bit 0 = moving
 *   bit 1 = airborne
 */

/** 识别合法 SAB 的 magic 标记，ASCII "WST1" */
export const WORLD_STATE_MAGIC = 0x57535431;
/** 布局版本号；若改变任何字段偏移则递增 */
export const WORLD_STATE_LAYOUT_VERSION = 2;

// ─── 内存布局常量 ────────────────────────────────────────────────────────────

/** 头部字节数（4 × Int32 = 16） */
const HEADER_BYTES = 16;
/** 头部 Int32 索引 */
const HDR_MAGIC = 0;
const HDR_VERSION = 1;
const HDR_MEMBER_COUNT = 2;
/** seqlock 计数器在 Int32Array 里的索引 */
export const SEQ_IDX = 3;

/** 每个成员槽的 Float32 字段数 */
const SLOT_FLOATS = 6;
/** 每个成员槽的字节数 */
export const SLOT_BYTES = SLOT_FLOATS * 4;

/** 槽内 Float32 偏移 */
const F_POS_X = 0;
const F_POS_Y = 1;
const F_POS_Z = 2;
const F_YAW = 3;
const F_SPEED = 4;
const F_STATE_FLAGS = 5;

/** stateFlags 位掩码 */
export const STATE_FLAG_MOVING = 1 << 0;
export const STATE_FLAG_AIRBORNE = 1 << 1;

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/** 计算指定成员槽在 Float32Array 里的起始索引（Float32 单元，非字节）。 */
function slotF32Offset(memberIndex: number): number {
	// header 占 HEADER_BYTES / 4 = 4 个 Float32 单元；然后每成员 SLOT_FLOATS 个
	return HEADER_BYTES / 4 + memberIndex * SLOT_FLOATS;
}

/** 计算所需 SAB 字节大小。 */
export function calcWorldStateBufferBytes(memberCount: number): number {
	if (!Number.isInteger(memberCount) || memberCount < 0) throw new Error(`非法世界状态成员数: ${memberCount}`);
	return HEADER_BYTES + memberCount * SLOT_BYTES;
}

/** 在线程附件边界验证完整布局，避免非法 SAB 延迟表现为成员位置错位。 */
function readWorldStateMemberCount(buf: SharedArrayBuffer): number {
	if (buf.byteLength < HEADER_BYTES) throw new Error(`世界状态 SAB 长度不足: ${buf.byteLength}`);
	const header = new Int32Array(buf, 0, HEADER_BYTES / Int32Array.BYTES_PER_ELEMENT);
	const magic = Atomics.load(header, HDR_MAGIC);
	if (magic !== WORLD_STATE_MAGIC) throw new Error(`非法世界状态 SAB magic: ${magic}`);
	const layoutVersion = Atomics.load(header, HDR_VERSION);
	if (layoutVersion !== WORLD_STATE_LAYOUT_VERSION) {
		throw new Error(`不支持的世界状态 SAB 布局版本: ${layoutVersion}`);
	}
	const memberCount = Atomics.load(header, HDR_MEMBER_COUNT);
	const expectedBytes = calcWorldStateBufferBytes(memberCount);
	if (buf.byteLength !== expectedBytes) {
		throw new Error(`世界状态 SAB 长度不匹配: ${buf.byteLength}，期望 ${expectedBytes}`);
	}
	return memberCount;
}

/** 创建并初始化 SAB（主线程调用，loadScenario 后成员数固定时）。 */
export function createWorldStateBuffer(memberCount: number): SharedArrayBuffer {
	const buf = new SharedArrayBuffer(calcWorldStateBufferBytes(memberCount));
	const i32 = new Int32Array(buf);
	i32[HDR_MAGIC] = WORLD_STATE_MAGIC;
	i32[HDR_VERSION] = WORLD_STATE_LAYOUT_VERSION;
	i32[HDR_MEMBER_COUNT] = memberCount;
	Atomics.store(i32, SEQ_IDX, 0); // 初始稳定版本
	return buf;
}

// ─── 成员索引映射 ─────────────────────────────────────────────────────────────

/**
 * 成员槽位索引映射（memberId → 槽位下标）。
 * loadScenario 后由主线程和 worker 分别按相同顺序构造，无需额外同步。
 * 字符串 memberId 只在映射构造时使用，SAB 内部不存储字符串。
 */
export class MemberSlotIndex {
	private readonly map = new Map<string, number>();

	constructor(memberIds: string[]) {
		memberIds.forEach((id, i) => {
			if (this.map.has(id)) throw new Error(`世界状态成员 ID 重复: ${id}`);
			this.map.set(id, i);
		});
	}

	get(memberId: string): number | undefined {
		return this.map.get(memberId);
	}

	get size(): number {
		return this.map.size;
	}
}

// ─── Writer（Worker 侧） ─────────────────────────────────────────────────────

export interface WorldStateMemberData {
	id: string;
	position: { x: number; y: number; z: number };
	yaw: number;
	speed: number;
	/** bit0 = moving, bit1 = airborne */
	stateFlags?: number;
}

/**
 * SAB 写入器，在 Worker 线程内每 tick 末调用 write()。
 * seqlock 包围写入，保证主线程读取的原子性。
 */
export class WorldStateWriter {
	private readonly i32: Int32Array;
	private readonly f32: Float32Array;
	private readonly memberCount: number;

	constructor(
		buf: SharedArrayBuffer,
		private readonly slotIndex: MemberSlotIndex,
	) {
		this.memberCount = readWorldStateMemberCount(buf);
		if (this.memberCount !== slotIndex.size) {
			throw new Error(`世界状态成员索引数量不匹配: ${slotIndex.size}，期望 ${this.memberCount}`);
		}
		this.i32 = new Int32Array(buf);
		this.f32 = new Float32Array(buf);
	}

	/**
	 * 以 seqlock 写入所有成员状态。
	 * 调用者保证每 tick 只调用一次（单写者）。
	 */
	write(members: readonly WorldStateMemberData[]): void {
		// seqlock: 开始写（奇数）
		Atomics.add(this.i32, SEQ_IDX, 1);

		for (const member of members) {
			const slotIdx = this.slotIndex.get(member.id);
			if (slotIdx === undefined || slotIdx >= this.memberCount) continue;
			const f32Off = slotF32Offset(slotIdx);
			this.f32[f32Off + F_POS_X] = member.position.x;
			this.f32[f32Off + F_POS_Y] = member.position.y;
			this.f32[f32Off + F_POS_Z] = member.position.z;
			this.f32[f32Off + F_YAW] = member.yaw;
			this.f32[f32Off + F_SPEED] = member.speed;
			this.f32[f32Off + F_STATE_FLAGS] = member.stateFlags ?? 0;
		}

		// seqlock: 结束写（偶数）
		Atomics.add(this.i32, SEQ_IDX, 1);
	}
}

// ─── Reader（主线程侧） ──────────────────────────────────────────────────────

export interface WorldStateSlot {
	posX: number;
	posY: number;
	posZ: number;
	yaw: number;
	speed: number;
	/** bit0 = moving, bit1 = airborne */
	stateFlags: number;
}

/** 读取单个槽位时的临时缓冲（避免每次 read 分配对象）。 */
const _tmpSlot: WorldStateSlot = { posX: 0, posY: 0, posZ: 0, yaw: 0, speed: 0, stateFlags: 0 };

const MAX_SEQLOCK_RETRIES = 8;

/**
 * SAB 读取器，在主线程渲染帧内每帧调用 readSlot()。
 * seqlock 重试保证读到一致状态（写入冲突极短，一般 0-1 次重试）。
 */
export class WorldStateReader {
	private readonly i32: Int32Array;
	private readonly f32: Float32Array;
	readonly memberCount: number;

	constructor(buf: SharedArrayBuffer) {
		this.memberCount = readWorldStateMemberCount(buf);
		this.i32 = new Int32Array(buf);
		this.f32 = new Float32Array(buf);
	}

	/**
	 * seqlock 读取指定槽位，写入 out 对象（默认复用内部临时对象避免分配）。
	 * 返回 null 表示重试超限（极低概率），调用方应跳过本帧更新。
	 */
	readSlot(slotIdx: number, out: WorldStateSlot = _tmpSlot): WorldStateSlot | null {
		if (slotIdx < 0 || slotIdx >= this.memberCount) return null;
		const f32Off = slotF32Offset(slotIdx);

		for (let retry = 0; retry < MAX_SEQLOCK_RETRIES; retry++) {
			const v1 = Atomics.load(this.i32, SEQ_IDX);
			if (v1 & 1) continue; // 写入中，自旋重试

			out.posX = this.f32[f32Off + F_POS_X];
			out.posY = this.f32[f32Off + F_POS_Y];
			out.posZ = this.f32[f32Off + F_POS_Z];
			out.yaw = this.f32[f32Off + F_YAW];
			out.speed = this.f32[f32Off + F_SPEED];
			out.stateFlags = this.f32[f32Off + F_STATE_FLAGS];

			const v2 = Atomics.load(this.i32, SEQ_IDX);
			if (v1 === v2) return out; // 一致，读取成功
			// 写入跨越了读取，重试
		}
		return null; // 重试耗尽
	}

	/**
	 * 返回当前 seqlock 版本号（偶数=稳定，奇数=写入中）。
	 * 可用于调试或跳帧检测。
	 */
	getSeqVersion(): number {
		return Atomics.load(this.i32, SEQ_IDX);
	}
}
