import type { JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { setTopGroup } from "../topGroup";

export type GlobalFormEntryApi = {
	readonly id: string;
	readonly index: number;
	readonly total: number;
	close: () => void;
	closeTop: () => void;
};

export type GlobalFormEntry = {
	id?: string;
	render: (api: GlobalFormEntryApi) => JSX.Element;
	onClose?: () => void;
};

export type GlobalFormEntryState = GlobalFormEntry & {
	id: string;
	isClosing: boolean;
};

let formEntrySerial = 0;

const createFormEntryId = () => {
	formEntrySerial += 1;
	return `global-form-${Date.now()}-${formEntrySerial}`;
};

const [entries, setEntries] = createStore<GlobalFormEntryState[]>([]);

const findTopOpenEntryIndex = () => {
	for (let index = entries.length - 1; index >= 0; index -= 1) {
		if (!entries[index].isClosing) return index;
	}
	return -1;
};

/**
 * 全局表单控制器只保存运行时 UI 栈，不进入持久化 store。
 * 设计目的：表单 entry 会携带 render 闭包，持久化它会破坏 localStorage 的 JSON 边界。
 */
export const globalFormGroup = {
	add(entry: GlobalFormEntry) {
		const id = entry.id ?? createFormEntryId();
		setEntries((previous) => [...previous, { ...entry, id, isClosing: false }]);
		setTopGroup("form");
		return id;
	},

	remove(id?: string) {
		const targetIndex = id === undefined ? findTopOpenEntryIndex() : entries.findIndex((entry) => entry.id === id);
		if (targetIndex < 0) return;

		const targetEntry = entries[targetIndex];
		if (!targetEntry || targetEntry.isClosing) return;

		// 设计说明：remove 只声明关闭意图，实际节点清理由容器在退出动画完成后提交。
		setEntries(targetIndex, "isClosing", true);
		targetEntry.onClose?.();
	},

	clear() {
		for (const [index, entry] of entries.entries()) {
			if (!entry.isClosing) {
				setEntries(index, "isClosing", true);
				entry.onClose?.();
			}
		}
	},

	commitRemoval(id: string) {
		setEntries((previous) => previous.filter((entry) => entry.id !== id));
	},

	entries() {
		return entries;
	},

	size() {
		return entries.length;
	},
};
