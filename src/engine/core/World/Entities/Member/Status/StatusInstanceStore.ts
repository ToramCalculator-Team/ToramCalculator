import type { Checkpointable } from "~/engine/core/Checkpoint";
import type {
	MutableStatusInstanceStore,
	StatusChangeListener,
	StatusInstance,
	StatusInstanceStoreCheckpoint,
	StatusType,
} from "./types";

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

	constructor(private readonly getCurrentTimeMs: () => number) {}

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
				timeMs: this.getCurrentTimeMs(),
			});
		} catch {
			// listener 抛错不应影响 status 状态；错误在 listener 内部记录。
		}
	}

	list(): StatusInstance[] {
		this.purgeExpired(this.getCurrentTimeMs());
		return Array.from(this.instances.values());
	}

	getByType(type: StatusType): StatusInstance[] {
		this.purgeExpired(this.getCurrentTimeMs());
		return this.list().filter((instance) => instance.type === type);
	}

	hasStatus(type: StatusType): boolean {
		this.purgeExpired(this.getCurrentTimeMs());
		return this.getByType(type).length > 0;
	}

	getStatusRemaining(type: StatusType, currentTimeMs: number): number | null {
		this.purgeExpired(currentTimeMs);
		const instance = this.getByType(type)[0];
		if (!instance) return null;
		if (instance.expiresAtMs === undefined) return null;
		return Math.max(0, instance.expiresAtMs - currentTimeMs);
	}

	getStatusTags(currentTimeMs: number): string[] {
		this.purgeExpired(currentTimeMs);
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

	purgeExpired(currentTimeMs: number): void {
		for (const [id, instance] of this.instances.entries()) {
			if (instance.expiresAtMs !== undefined && instance.expiresAtMs <= currentTimeMs) {
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
					appliedAtMs: inst.appliedAtMs,
					resolvedDurationMs: inst.resolvedDurationMs,
					expiresAtMs: inst.expiresAtMs,
					tags: inst.tags,
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
