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

export interface MutableStatusInstanceStore
	extends StatusInstanceStore, Checkpointable<StatusInstanceStoreCheckpoint> {
	apply(instance: StatusInstance): void;
	removeById(id: string): void;
	removeByType(type: StatusType): void;
	purgeExpired(currentFrame: number): void;
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

	constructor(private readonly getCurrentFrame: () => number) {}

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
		this.removeByType(instance.type);
		this.instances.set(instance.id, instance);
	}

	removeById(id: string): void {
		this.instances.delete(id);
	}

	removeByType(type: StatusType): void {
		for (const [id, instance] of this.instances.entries()) {
			if (instance.type === type) {
				this.instances.delete(id);
			}
		}
	}

	purgeExpired(currentFrame: number): void {
		for (const [id, instance] of this.instances.entries()) {
			if (instance.expiresAtFrame !== undefined && instance.expiresAtFrame <= currentFrame) {
				this.instances.delete(id);
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
