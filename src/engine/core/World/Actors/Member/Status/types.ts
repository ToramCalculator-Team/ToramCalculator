import type { Checkpointable } from "~/engine/core/Checkpoint";

export type StatusType = string;

// 状态实例
export interface StatusInstance {
	id: string;
	type: StatusType;
	sourceId?: string;
	sourceSkillId?: string;
	appliedAtMs: number;
	resolvedDurationMs?: number;
	expiresAtMs?: number;
	tags?: string[];
}

/**
 * Status 变更事件（供 Member 路由到 ProcBus 派发 `status.entered` / `status.exited`）。
 *
 * reason：
 *   - `entered`：apply 一个新实例
 *   - `expired`：自然到期被 purgeExpired 移除
 *   - `removed`：被 removeById / removeByType 主动移除
 */
export interface StatusChangeEvent {
	kind: "entered" | "exited";
	instance: StatusInstance;
	reason?: "expired" | "removed";
	timeMs: number;
}

export type StatusChangeListener = (event: StatusChangeEvent) => void;

export interface MutableStatusInstanceStore extends StatusInstanceStore, Checkpointable<StatusInstanceStoreCheckpoint> {
	apply(instance: StatusInstance): void;
	removeById(id: string): void;
	removeByType(type: StatusType): void;
	purgeExpired(currentTimeMs: number): void;
	/** 设置状态变更监听器（每 store 至多一个；Member 构造后立即接入，后续覆盖 = 覆盖旧 handler）。 */
	setChangeListener(listener: StatusChangeListener | null): void;
}

/**
 * 状态实例仓库接口。
 *
 * 说明：
 * - 这里承载的是“状态实例”，不是成员级 stat。
 * - 第一轮先冻结接口边界，具体实现会在后续状态系统迭代中补上。
 */
export interface StatusInstanceStore {
	list(): StatusInstance[];
	getByType(type: StatusType): StatusInstance[];
	hasStatus(type: StatusType): boolean;
	getStatusRemaining(type: StatusType, currentTimeMs: number): number | null;
	getStatusTags(currentTimeMs: number): string[];
}

/** StatusInstanceStore 检查点 */
export interface StatusInstanceStoreCheckpoint {
	instances: Array<{
		id: string;
		type: string;
		sourceId?: string;
		sourceSkillId?: string;
		appliedAtMs: number;
		resolvedDurationMs?: number;
		expiresAtMs?: number;
		tags?: string[];
	}>;
}
