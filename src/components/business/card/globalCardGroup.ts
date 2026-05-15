import type { JSX } from "solid-js";
import { createStore } from "solid-js/store";

export type GlobalCardEntryApi = {
	readonly id: string;
	readonly index: number;
	readonly total: number;
	close: () => void;
	closeTop: () => void;
};

export type GlobalCardEntry = {
	id?: string;
	title?: string;
	titleIcon?: () => JSX.Element;
	render: (api: GlobalCardEntryApi) => JSX.Element;
	onClose?: () => void;
};

export type GlobalCardEntryState = GlobalCardEntry & {
	id: string;
	closing: boolean;
};

let cardEntrySerial = 0;

const createCardEntryId = () => {
	cardEntrySerial += 1;
	return `global-card-${Date.now()}-${cardEntrySerial}`;
};

const [entries, setEntries] = createStore<GlobalCardEntryState[]>([]);

/**
 * 全局卡片控制器只保存运行时 UI 栈，不进入持久化 store。
 * 设计目的：卡片展示的是当前交互产生的记录快照，持久化会在刷新和同步后恢复过期内容。
 */
export const globalCardGroup = {
	add(entry: GlobalCardEntry) {
		const id = entry.id ?? createCardEntryId();
		setEntries((previous) => [...previous, { ...entry, id, closing: false }]);
		return id;
	},

	/** 标记卡片为关闭中，触发退出动画。动画结束后由 confirmRemove 真正移除。 */
	remove(id?: string) {
		const targetIndex = id === undefined ? entries.length - 1 : entries.findIndex((entry) => entry.id === id);
		if (targetIndex < 0) return;

		const targetEntry = entries[targetIndex];
		if (!targetEntry || targetEntry.closing) return;

		targetEntry.onClose?.();
		setEntries(targetIndex, "closing", true);
	},

	/** 退出动画完成后真正从数组中移除 */
	confirmRemove(id: string) {
		setEntries((previous) => previous.filter((entry) => entry.id !== id));
	},

	clear() {
		for (const entry of entries) {
			entry.onClose?.();
		}
		setEntries([]);
	},

	entries() {
		return entries;
	},

	size() {
		return entries.length;
	},

	/** 非关闭中的卡片数量，用于计算旋转角度（关闭瞬间即响应） */
	activeSize() {
		return entries.filter((e) => !e.closing).length;
	},
};