/**
 * 属性阈值事件源（ADR 0010：AttributeWatcher 降格为 ProcBus 事件源）。
 *
 * 职责（与旧 `AttributeWatcherRegistry` 的区别）：
 * - 旧 watcher 是**独立订阅系统**：业务 handler 直接挂在它上面，跨越即调 handler。
 * - 本组件是**喂 ProcBus 的适配器**：它只订阅 `StatContainer.onChange`、检测跨越，
 *   跨越的那一刻 `emit("attr.crossed", payload)` 到成员内总线。业务响应统一改为
 *   订阅 ProcBus 的 `attr.crossed` 事件（在 predicate 里按 path + 阈值过滤）。
 *
 * 它不持有业务 handler、不返回供业务用的订阅 id；持有的「上次值」是纯派生状态，
 * checkpoint restore 后由安装逻辑重新 register 重建（与 ProcBus 订阅同样靠重放）。
 */

import { createLogger } from "~/lib/Logger";
import type { StatContainer } from "../StatContainer/StatContainer";

const log = createLogger("AttrThresholdSource");

/** 阈值穿越方向。 */
export type ThresholdDirection = "rising" | "falling" | "both";

/** 派发 `attr.crossed` 的回调（由 Member 接到本成员 ProcBus.emit）。 */
export type AttrCrossedEmitter = (payload: {
	sourceId: string;
	registrationId: number;
	path: string;
	threshold: number;
	oldValue: number;
	newValue: number;
	direction: "rising" | "falling";
}) => void;

interface ThresholdEntry {
	/** 注册内部序号；随 emit payload 传出，供订阅者只认自己那一条注册。 */
	registrationId: number;
	sourceId: string;
	path: string;
	threshold: number;
	direction: ThresholdDirection;
	/** StatContainer.onChange 返回的取消函数。 */
	unsubscribe: () => void;
}

export interface RegisterOptions {
	fireOnRegister?: boolean;
}

/**
 * 每成员一个实例。`container` 用于读当前值 + 订阅变更；`emit` 把跨越事件送入 ProcBus。
 */
export class AttributeThresholdSource<TAttrKey extends string = string> {
	private readonly entries = new Map<number, ThresholdEntry>();
	private nextId = 1;

	constructor(
		private readonly container: StatContainer<TAttrKey>,
		private emit: AttrCrossedEmitter | null,
	) {}

	/** 注入/替换 emit 回调（Member 在 setEventCatalog 接通 ProcBus 时调用）。 */
	setEmitter(emit: AttrCrossedEmitter | null): void {
		this.emit = emit;
	}

	/**
	 * 注册一个被监控的阈值点。跨越时派发 `attr.crossed`。
	 * 返回内部 id 仅供 `unregister` 使用；业务响应不依赖它（业务订阅 ProcBus）。
	 */
	register(
		sourceId: string,
		path: TAttrKey,
		threshold: number,
		direction: ThresholdDirection,
		options?: RegisterOptions,
	): number {
		const id = this.nextId++;
		const initialValue = this.container.getValue(path);
		const entry: ThresholdEntry = {
			registrationId: id,
			sourceId,
			path,
			threshold,
			direction,
			unsubscribe: () => {},
		};
		entry.unsubscribe = this.container.onChange(path, (oldValue, newValue) => {
			this.handleChange(entry, oldValue, newValue);
		});
		this.entries.set(id, entry);
		if (options?.fireOnRegister) this.tryFireAtRegister(entry, initialValue);
		return id;
	}

	/** 取消单条注册。 */
	unregister(id: number): void {
		const entry = this.entries.get(id);
		if (!entry) return;
		entry.unsubscribe();
		this.entries.delete(id);
	}

	/** 按 sourceId 取消该来源的所有注册（passive / buff 卸载时用）。 */
	unregisterBySource(sourceId: string): void {
		for (const [id, entry] of this.entries) {
			if (entry.sourceId === sourceId) {
				entry.unsubscribe();
				this.entries.delete(id);
			}
		}
	}

	/** 当前注册数量（调试用）。 */
	get size(): number {
		return this.entries.size;
	}

	/** 清空所有注册（成员销毁用）。 */
	clear(): void {
		for (const entry of this.entries.values()) entry.unsubscribe();
		this.entries.clear();
	}

	/** 检测是否跨过阈值；跨过则 emit `attr.crossed` 到 ProcBus。 */
	private handleChange(entry: ThresholdEntry, oldValue: number, newValue: number): void {
		if (oldValue === newValue) return;
		const crossed = this.detectCrossing(oldValue, newValue, entry.threshold, entry.direction);
		if (!crossed) return;
		const direction: "rising" | "falling" = newValue > oldValue ? "rising" : "falling";
		this.fire(entry, oldValue, newValue, direction);
	}

	/**
	 * 判定 oldValue → newValue 是否跨越 threshold，方向匹配 `direction`。
	 * 相等边界计入「到达的那一侧」，使「跌破 25%」能命中 `hp === 25%` 的点。
	 */
	private detectCrossing(
		oldValue: number,
		newValue: number,
		threshold: number,
		direction: ThresholdDirection,
	): boolean {
		const fellThrough = oldValue > threshold && newValue <= threshold;
		const roseThrough = oldValue < threshold && newValue >= threshold;
		switch (direction) {
			case "falling":
				return fellThrough;
			case "rising":
				return roseThrough;
			case "both":
				return fellThrough || roseThrough;
		}
	}

	private fire(entry: ThresholdEntry, oldValue: number, newValue: number, direction: "rising" | "falling"): void {
		if (!this.emit) {
			log.warn(`attr.crossed 派发失败：emitter 未注入 (source=${entry.sourceId}, path=${entry.path})`);
			return;
		}
		try {
			this.emit({
				sourceId: entry.sourceId,
				registrationId: entry.registrationId,
				path: entry.path,
				threshold: entry.threshold,
				oldValue,
				newValue,
				direction,
			});
		} catch (error) {
			log.error(`attr.crossed emit 抛错 (source=${entry.sourceId}, path=${entry.path})`, error);
		}
	}

	private tryFireAtRegister(entry: ThresholdEntry, currentValue: number): void {
		const shouldFire =
			(entry.direction === "falling" && currentValue <= entry.threshold) ||
			(entry.direction === "rising" && currentValue >= entry.threshold) ||
			entry.direction === "both";
		if (!shouldFire) return;
		this.fire(entry, currentValue, currentValue, entry.direction === "rising" ? "rising" : "falling");
	}
}
