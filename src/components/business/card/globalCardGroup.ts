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
	titleIcon?: JSX.Element;
	render: (api: GlobalCardEntryApi) => JSX.Element;
	onClose?: () => void;
};

export type GlobalCardEntryState = GlobalCardEntry & {
	id: string;
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
		setEntries((previous) => [...previous, { ...entry, id }]);
		return id;
	},

	remove(id?: string) {
		const targetIndex = id === undefined ? entries.length - 1 : entries.findIndex((entry) => entry.id === id);
		if (targetIndex < 0) return;

		const targetEntry = entries[targetIndex];
		if (!targetEntry) return;

		targetEntry.onClose?.();
		if (id === undefined) {
			setEntries((previous) => previous.slice(0, -1));
			return;
		}
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
};
