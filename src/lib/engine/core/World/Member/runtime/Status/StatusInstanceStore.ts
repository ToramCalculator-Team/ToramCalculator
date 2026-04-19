import type { Checkpointable, StatusInstanceStoreCheckpoint } from "../../../../types";

export type StatusType = string;

export interface StatusInstance {
	id: string;
	type: StatusType;
	sourceId?: string;
	sourceSkillId?: string;
	appliedAtFrame: number;
	resolvedDurationFrames?: number;
	expiresAtFrame?: number;
	stacks?: number;
	tags?: string[];
	meta?: Record<string, unknown>;
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
	frame: number;
}

export type StatusChangeListener = (event: StatusChangeEvent) => void;

export interface MutableStatusInstanceStore
	extends StatusInstanceStore, Checkpointable<StatusInstanceStoreCheckpoint> {
	apply(instance: StatusInstance): void;
	removeById(id: string): void;
	removeByType(type: StatusType): void;
	purgeExpired(currentFrame: number): void;
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
	getStatusRemaining(type: StatusType, currentFrame: number): number | null;
	getStatusTags(currentFrame: number): string[];
}

/**
 * 内存版状态实例仓库。
 *
 * 当前策略：
 * - 同类型状态先按“单实例”处理，新的实例会覆盖旧实例
 * - 过期实例在显式 purge 时移除
 * - `tags` 为空时，默认使用 `type` 作为单一 tag
 */
export class InMemoryStatusInstanceStore
	implements MutableStatusInstanceStore, Checkpointable<StatusInstanceStoreCheckpoint>
{
	private readonly instances = new Map<string, StatusInstance>();
	private changeListener: StatusChangeListener | null = null;

	constructor(private readonly getCurrentFrame: () => number) {}

	setChangeListener(listener: StatusChangeListener | null): void {
		this.changeListener = listener;
	}

	private notify(kind: "entered" | "exited", instance: StatusInstance, reason?: "expired" | "removed"): void {
		if (!this.changeListener) return;
		try {
			this.changeListener({
				kind,
				instance,
				reason,
				frame: this.getCurrentFrame(),
			});
		} catch {
			// listener 抛错不应影响 status 状态；错误在 listener 内部记录。
		}
	}

	list(): StatusInstance[] {
		this.purgeExpired(this.getCurrentFrame());
		return Array.from(this.instances.values());
	}

	getByType(type: StatusType): StatusInstance[] {
		this.purgeExpired(this.getCurrentFrame());
		return this.list().filter((instance) => instance.type === type);
	}

	hasStatus(type: StatusType): boolean {
		this.purgeExpired(this.getCurrentFrame());
		return this.getByType(type).length > 0;
	}

	getStatusRemaining(type: StatusType, currentFrame: number): number | null {
		this.purgeExpired(currentFrame);
		const instance = this.getByType(type)[0];
		if (!instance) return null;
		if (instance.expiresAtFrame === undefined) return null;
		return Math.max(0, instance.expiresAtFrame - currentFrame);
	}

	getStatusTags(currentFrame: number): string[] {
		this.purgeExpired(currentFrame);
		const tags = new Set<string>();
		for (const instance of this.instances.values()) {
			const instanceTags = instance.tags?.length ? instance.tags : [instance.type];
			for (const tag of instanceTags) {
				tags.add(tag);
			}
		}
		return [...tags];
	}

	apply(instance: StatusInstance): void {
		// 第一版策略：同类型状态覆盖旧实例，避免重复 sleep/poison 堆叠语义未定。
		// removeByType 会为旧实例派发 `exited (reason=removed)`。
		this.removeByType(instance.type);
		this.instances.set(instance.id, instance);
		this.notify("entered", instance);
	}

	removeById(id: string): void {
		const instance = this.instances.get(id);
		if (!instance) return;
		this.instances.delete(id);
		this.notify("exited", instance, "removed");
	}

	removeByType(type: StatusType): void {
		for (const [id, instance] of this.instances.entries()) {
			if (instance.type === type) {
				this.instances.delete(id);
				this.notify("exited", instance, "removed");
			}
		}
	}

	purgeExpired(currentFrame: number): void {
		for (const [id, instance] of this.instances.entries()) {
			if (instance.expiresAtFrame !== undefined && instance.expiresAtFrame <= currentFrame) {
				this.instances.delete(id);
				this.notify("exited", instance, "expired");
			}
		}
	}

	captureCheckpoint(): StatusInstanceStoreCheckpoint {
		const instances: StatusInstanceStoreCheckpoint["instances"] = [];
		for (const inst of this.instances.values()) {
			instances.push(
				structuredClone({
					id: inst.id,
					type: inst.type,
					sourceId: inst.sourceId,
					sourceSkillId: inst.sourceSkillId,
					appliedAtFrame: inst.appliedAtFrame,
					resolvedDurationFrames: inst.resolvedDurationFrames,
					expiresAtFrame: inst.expiresAtFrame,
					stacks: inst.stacks,
					tags: inst.tags,
					meta: inst.meta,
				}),
			);
		}
		return { instances };
	}

	restoreCheckpoint(checkpoint: StatusInstanceStoreCheckpoint): void {
		this.instances.clear();
		for (const row of checkpoint.instances) {
			const inst: StatusInstance = structuredClone(row);
			this.instances.set(inst.id, inst);
		}
	}
}
