import { createMemo, createSignal } from "solid-js";

export type UseBtHistoryOptions<TSnapshot> = {
	createSnapshot: () => TSnapshot;
	restoreSnapshot: (snapshot: TSnapshot) => void;
	canRecord?: () => boolean;
	limit?: number;
};

/**
 * 管理行为树编辑历史。
 *
 * 设计说明：历史层只保存快照，不理解快照内容；document、agent、slots 的一致性由调用方定义。
 */
export function useBtHistory<TSnapshot>(options: UseBtHistoryOptions<TSnapshot>) {
	const limit = options.limit ?? 50;
	const [undoStack, setUndoStack] = createSignal<TSnapshot[]>([]);
	const [redoStack, setRedoStack] = createSignal<TSnapshot[]>([]);

	const canUndo = createMemo(() => undoStack().length > 0);
	const canRedo = createMemo(() => redoStack().length > 0);

	const recordHistory = () => {
		if (options.canRecord && !options.canRecord()) return;
		setUndoStack((stack) => [...stack, options.createSnapshot()].slice(-limit));
		setRedoStack([]);
	};

	const undo = () => {
		const stack = undoStack();
		const snapshot = stack.at(-1);
		if (!snapshot) return;
		setUndoStack(stack.slice(0, -1));
		setRedoStack((future) => [options.createSnapshot(), ...future].slice(0, limit));
		options.restoreSnapshot(snapshot);
	};

	const redo = () => {
		const future = redoStack();
		const snapshot = future[0];
		if (!snapshot) return;
		setRedoStack(future.slice(1));
		setUndoStack((stack) => [...stack, options.createSnapshot()].slice(-limit));
		options.restoreSnapshot(snapshot);
	};

	return {
		canUndo,
		canRedo,
		recordHistory,
		undo,
		redo,
	};
}
