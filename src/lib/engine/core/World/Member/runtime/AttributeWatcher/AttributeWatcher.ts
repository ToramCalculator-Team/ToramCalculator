/**
 * 属性阈值观察器。
 *
 * 订阅 `StatContainer.onChange`，在属性值**跨越注册阈值**的那一刻唤醒 handler。
 * 未跨线的写入 O(1) 比对后直接 no-op，成本与注册阈值数成正比、与 passive 总数无关。
 *
 * 设计要点：
 * - 数据层（StatContainer）只提供 `onChange` 纯机制；阈值 / 方向 / 去重 逻辑全部在编排层这里。
 * - 注册时使用 passive / skill / buff 的 id 作为 sourceId，checkpoint 回放时按 sourceId 重放注册。
 * - 初始方向判定：注册时采样一次当前值，以判定"首次跨越"是否应该触发（`fireOnRegister` 参数）。
 *
 * 典型用例：
 * - HP 紧急回复：跨 `hp.max * 0.25` 向下 → 回血 + 冷却
 * - 灵光剑舞终止：跨 `hp.max * 0.05` 向下 → 结束 buff
 */

import { createLogger } from "~/lib/Logger";
import type { StatContainer } from "../StatContainer/StatContainer";

const log = createLogger("AttrWatcher");

/** 阈值穿越方向。 */
export type WatchDirection = "rising" | "falling" | "both";

export interface WatchOptions {
	/**
	 * 注册时是否检查当前值与阈值的关系，并在"已在目标侧"时立即触发一次。
	 * 默认 `false` —— 只响应真实的跨越事件，避免安装 passive 时莫名触发。
	 */
	fireOnRegister?: boolean;
}

export interface WatchHandlerContext {
	readonly path: string;
	readonly threshold: number;
	readonly oldValue: number;
	readonly newValue: number;
	readonly direction: "rising" | "falling";
}

export type WatchHandler = (ctx: WatchHandlerContext) => void;

export interface AttributeWatcherCheckpoint {
	entries: Array<{
		sourceId: string;
		path: string;
		threshold: number;
		direction: WatchDirection;
	}>;
}

/**
 * 单条 watch 注册的不透明句柄。调用 `unwatch(id)` 取消。
 */
export type WatcherId = number;

interface WatcherEntry {
	id: WatcherId;
	sourceId: string;
	path: string;
	threshold: number;
	direction: WatchDirection;
	handler: WatchHandler;
	/** 上一次观测到的值（初始 = 注册时的当前值）。 */
	lastValue: number;
	/** StatContainer.onChange 返回的取消函数。 */
	unsubscribe: () => void;
}

/**
 * 每成员一个实例。`container` 用于读取当前值 + 订阅变更。
 */
export class AttributeWatcherRegistry<TAttrKey extends string = string> {
	private readonly entries = new Map<WatcherId, WatcherEntry>();
	private nextId: WatcherId = 1;

	constructor(private readonly container: StatContainer<TAttrKey>) {}

	/**
	 * 注册一个阈值观察器。
	 *
	 * @param sourceId 注册来源（passive/skill/buff 的 id）；同一 sourceId 可注册多条不冲突。
	 * @param path 属性路径（必须已在 schema 中声明）。
	 * @param threshold 阈值数值。
	 * @param direction `rising` 值上穿、`falling` 值下穿、`both` 两侧都算。
	 * @param handler 跨线时的回调。
	 */
	watch(
		sourceId: string,
		path: TAttrKey,
		threshold: number,
		direction: WatchDirection,
		handler: WatchHandler,
		options?: WatchOptions,
	): WatcherId {
		const id = this.nextId++;
		const initialValue = this.container.getValue(path);

		const entry: WatcherEntry = {
			id,
			sourceId,
			path,
			threshold,
			direction,
			handler,
			lastValue: initialValue,
			unsubscribe: () => {},
		};

		entry.unsubscribe = this.container.onChange(path, (oldValue, newValue) => {
			this.handleChange(entry, oldValue, newValue);
		});

		this.entries.set(id, entry);

		if (options?.fireOnRegister) {
			this.tryFireAtRegister(entry, initialValue);
		}

		return id;
	}

	/**
	 * 取消单条注册。
	 */
	unwatch(id: WatcherId): void {
		const entry = this.entries.get(id);
		if (!entry) return;
		entry.unsubscribe();
		this.entries.delete(id);
	}

	/**
	 * 按 sourceId 取消该来源的所有注册（passive / buff 被卸载时用）。
	 */
	unwatchBySource(sourceId: string): void {
		for (const [id, entry] of this.entries) {
			if (entry.sourceId === sourceId) {
				entry.unsubscribe();
				this.entries.delete(id);
			}
		}
	}

	/** 当前注册数量（用于调试 / 观察）。 */
	get size(): number {
		return this.entries.size;
	}

	/** 清空所有注册（常用于成员销毁）。 */
	clear(): void {
		for (const entry of this.entries.values()) entry.unsubscribe();
		this.entries.clear();
	}

	/**
	 * 捕获 checkpoint：仅导出可序列化的注册元数据（sourceId / path / threshold / direction）。
	 * handler 本身不可序列化，恢复时由各 passive / skill 的安装逻辑自行 re-watch。
	 */
	captureCheckpoint(): AttributeWatcherCheckpoint {
		return {
			entries: Array.from(this.entries.values()).map((e) => ({
				sourceId: e.sourceId,
				path: e.path,
				threshold: e.threshold,
				direction: e.direction,
			})),
		};
	}

	/**
	 * 处理属性变更事件：判定是否跨过注册阈值；跨过则调 handler。
	 */
	private handleChange(entry: WatcherEntry, oldValue: number, newValue: number): void {
		if (oldValue === newValue) return;
		const crossed = this.detectCrossing(oldValue, newValue, entry.threshold, entry.direction);
		entry.lastValue = newValue;
		if (!crossed) return;

		const actualDirection: "rising" | "falling" = newValue > oldValue ? "rising" : "falling";
		try {
			entry.handler({
				path: entry.path,
				threshold: entry.threshold,
				oldValue,
				newValue,
				direction: actualDirection,
			});
		} catch (error) {
			log.error(`AttributeWatcher handler 抛错 (source=${entry.sourceId}, path=${entry.path})`, error);
		}
	}

	/**
	 * 判定 oldValue → newValue 是否跨越 threshold，方向匹配 `direction`。
	 *
	 * 约定：
	 * - `falling`：oldValue > threshold && newValue <= threshold
	 * - `rising`：oldValue < threshold && newValue >= threshold
	 * - 相等边界计入"到达的那一侧"，使"跌破 25%"能命中 `hp === 25%` 的点。
	 */
	private detectCrossing(
		oldValue: number,
		newValue: number,
		threshold: number,
		direction: WatchDirection,
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

	private tryFireAtRegister(entry: WatcherEntry, currentValue: number): void {
		const shouldFire =
			(entry.direction === "falling" && currentValue <= entry.threshold) ||
			(entry.direction === "rising" && currentValue >= entry.threshold) ||
			entry.direction === "both";
		if (!shouldFire) return;
		try {
			entry.handler({
				path: entry.path,
				threshold: entry.threshold,
				oldValue: currentValue,
				newValue: currentValue,
				direction: entry.direction === "rising" ? "rising" : "falling",
			});
		} catch (error) {
			log.error(`AttributeWatcher fireOnRegister 抛错 (source=${entry.sourceId}, path=${entry.path})`, error);
		}
	}
}
