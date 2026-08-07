import { createMemo, createSignal } from "solid-js";
import {
	cloneEditableNode,
	type EditableBtDropPlacement,
	type EditableBtNode,
	type EditableBtNodeType,
	type EditableBtTree,
	findEditableNode,
	insertNodeByDropPlacement,
	isEditableNodeDescendant,
	moveNodeByDropPlacement,
	previewMoveNodeByDropPlacement,
} from "../model/editableTree";
import type { ClientPoint, TreeNodeDragStart } from "../types/workflow";

export type BtDragSession =
	| { phase: "idle" }
	| { phase: "library-dragging"; nodeType: EditableBtNodeType; placement?: EditableBtDropPlacement }
	| {
			phase: "tree-dragging";
			sourceNodeId: string;
			sourceNodeType: EditableBtNodeType;
			sourceSubtree: EditableBtNode;
			sourceRect: TreeNodeDragStart["sourceRect"];
			startPointer: ClientPoint;
			currentPointer: ClientPoint;
			placement?: EditableBtDropPlacement;
	  };

type BtDragSessionCore =
	| { phase: "idle" }
	| { phase: "library-dragging"; nodeType: EditableBtNodeType; placement?: EditableBtDropPlacement }
	| Omit<Extract<BtDragSession, { phase: "tree-dragging" }>, "currentPointer">;

type InsertPreview = {
	nodeType: EditableBtNodeType;
	placement: EditableBtDropPlacement;
};

export type UseBtDragDropOptions = {
	isReadOnly: () => boolean;
	getActiveTree: () => EditableBtTree;
	onTreeChange: (tree: EditableBtTree) => void;
	onSelectNode: (nodeId: string) => void;
	onOpenInspector: () => void;
};

/**
 * 管理结构化编辑器拖拽状态。
 *
 * 设计说明：拖拽会话保存“谁在拖、指针在哪、落点在哪”；预览树由会话派生，正式树只在提交时更新。
 */
export function useBtDragDrop(options: UseBtDragDropOptions) {
	const [dragSessionCore, setDragSessionCore] = createSignal<BtDragSessionCore>({ phase: "idle" });
	const [treeDragPointer, setTreeDragPointer] = createSignal<ClientPoint | undefined>();
	const [insertPreview, setInsertPreview] = createSignal<InsertPreview | undefined>();

	const isSamePlacement = (left?: EditableBtDropPlacement, right?: EditableBtDropPlacement | null): boolean =>
		(!left && !right) ||
		(!!left && !!right && left.targetNodeId === right.targetNodeId && left.intent === right.intent);

	const dragSession = createMemo<BtDragSession>(() => {
		const session = dragSessionCore();
		if (session.phase !== "tree-dragging") return session;
		return {
			...session,
			currentPointer: treeDragPointer() ?? session.startPointer,
		};
	});

	const draggedNodeType = createMemo<EditableBtNodeType | undefined>(() => {
		const session = dragSessionCore();
		if (session.phase === "library-dragging") return session.nodeType;
		if (session.phase === "tree-dragging") return session.sourceNodeType;
		return undefined;
	});

	const draggedTreeNodeId = createMemo<string | undefined>(() => {
		const session = dragSessionCore();
		return session.phase === "tree-dragging" ? session.sourceNodeId : undefined;
	});

	const activeDropPlacement = createMemo<EditableBtDropPlacement | undefined>(() => {
		const session = dragSessionCore();
		if (session.phase !== "idle") return session.placement;
		return insertPreview()?.placement;
	});

	const previewTree = createMemo<EditableBtTree | undefined>(() => {
		const session = dragSessionCore();
		if (session.phase === "tree-dragging" && session.placement) {
			return previewMoveNodeByDropPlacement(options.getActiveTree(), session.sourceNodeId, session.placement)?.tree;
		}
		if (session.phase === "library-dragging" && session.placement) {
			return insertNodeByDropPlacement(options.getActiveTree(), session.nodeType, session.placement, {
				placeholder: true,
			}).tree;
		}
		const preview = insertPreview();
		if (preview) {
			return insertNodeByDropPlacement(options.getActiveTree(), preview.nodeType, preview.placement, {
				placeholder: true,
			}).tree;
		}
		return undefined;
	});

	const startLibraryNodeDrag = (type: EditableBtNodeType) => {
		if (options.isReadOnly()) return;
		setInsertPreview(undefined);
		setTreeDragPointer(undefined);
		setDragSessionCore({ phase: "library-dragging", nodeType: type });
	};

	const startTreeNodeDrag = (payload: TreeNodeDragStart) => {
		if (options.isReadOnly()) return;
		const node = findEditableNode(options.getActiveTree(), payload.nodeId);
		if (!node || node.type === "root" || node.isPlaceholder) return;
		options.onSelectNode(payload.nodeId);
		setInsertPreview(undefined);
		setTreeDragPointer(payload.currentPointer);
		setDragSessionCore({
			phase: "tree-dragging",
			sourceNodeId: payload.nodeId,
			sourceNodeType: node.type,
			sourceSubtree: cloneEditableNode(node),
			sourceRect: payload.sourceRect,
			startPointer: payload.startPointer,
		});
	};

	const clearNodeDrag = () => {
		setDragSessionCore({ phase: "idle" });
		setTreeDragPointer(undefined);
	};

	const clearDanglingNodeDrag = () => {
		if (dragSessionCore().phase === "idle") return;
		clearNodeDrag();
	};

	const previewInsertNode = (placement: EditableBtDropPlacement, type: EditableBtNodeType = "action") => {
		if (options.isReadOnly() || dragSessionCore().phase !== "idle") return;
		const preview = insertPreview();
		if (preview?.nodeType === type && isSamePlacement(preview.placement, placement)) return;
		setInsertPreview({ nodeType: type, placement });
	};

	const clearInsertPreview = () => {
		if (dragSessionCore().phase !== "idle") return;
		setInsertPreview(undefined);
	};

	const commitInsertNode = (placement: EditableBtDropPlacement, type: EditableBtNodeType = "action") => {
		if (options.isReadOnly()) return;
		const result = insertNodeByDropPlacement(options.getActiveTree(), type, placement);
		options.onTreeChange(result.tree);
		if (result.nodeId) {
			options.onSelectNode(result.nodeId);
			options.onOpenInspector();
		}
		clearInsertPreview();
	};

	const updateNodeDropPreview = (placement: EditableBtDropPlacement | null, pointer?: ClientPoint) => {
		const session = dragSessionCore();
		if (options.isReadOnly() || session.phase === "idle") return;
		if (session.phase === "tree-dragging" && pointer) {
			setTreeDragPointer(pointer);
		}
		if (!placement) {
			if (!isSamePlacement(session.placement, undefined)) {
				setDragSessionCore({ ...session, placement: undefined });
			}
			return;
		}
		const result =
			session.phase === "tree-dragging"
				? previewMoveNodeByDropPlacement(options.getActiveTree(), session.sourceNodeId, placement)
				: insertNodeByDropPlacement(options.getActiveTree(), session.nodeType, placement, { placeholder: true });
		if (!result) {
			if (!isSamePlacement(session.placement, undefined)) {
				setDragSessionCore({ ...session, placement: undefined });
			}
			return;
		}
		if (!isSamePlacement(session.placement, placement)) {
			setDragSessionCore({ ...session, placement });
		}
	};

	const commitNodeDrop = (placement: EditableBtDropPlacement | null) => {
		const session = dragSessionCore();
		if (session.phase === "idle" || !placement || options.isReadOnly()) {
			clearNodeDrag();
			return;
		}
		const result =
			session.phase === "tree-dragging"
				? moveNodeByDropPlacement(options.getActiveTree(), session.sourceNodeId, placement)
				: insertNodeByDropPlacement(options.getActiveTree(), session.nodeType, placement);
		if (!result) {
			clearNodeDrag();
			return;
		}
		options.onTreeChange(result.tree);
		// 设计说明：拖拽提交只改变树结构和当前选择；属性 Sheet 由节点菜单显式打开，避免 pointerup 被解释成配置操作。
		if (result.nodeId) {
			options.onSelectNode(result.nodeId);
		}
		clearNodeDrag();
	};

	const canDropOnNode = (id: string) => {
		const sourceNodeId = draggedTreeNodeId();
		return (
			!sourceNodeId || (id !== sourceNodeId && !isEditableNodeDescendant(options.getActiveTree(), sourceNodeId, id))
		);
	};

	return {
		dragSession,
		draggedNodeType,
		draggedTreeNodeId,
		activeDropPlacement,
		previewTree,
		startLibraryNodeDrag,
		startTreeNodeDrag,
		clearNodeDrag,
		clearDanglingNodeDrag,
		updateNodeDropPreview,
		commitNodeDrop,
		previewInsertNode,
		clearInsertPreview,
		commitInsertNode,
		canDropOnNode,
	};
}
