import { createSignal } from "solid-js";
import {
	findEditableNode,
	type EditableBtDropPlacement,
	type EditableBtNodeType,
	type EditableBtTree,
	insertNodeByDropPlacement,
	isEditableNodeDescendant,
	materializePlaceholderTree,
	moveNodeByDropPlacement,
} from "../model/editableTree";

type DragPreview = {
	key: string;
	tree: EditableBtTree;
	nodeId: string;
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
 * 设计说明：占位预览和最终提交复用同一套树操作，保证拖拽不会丢失节点 id、参数和回调/守卫字段。
 */
export function useBtDragDrop(options: UseBtDragDropOptions) {
	const [draggedNodeType, setDraggedNodeType] = createSignal<EditableBtNodeType | undefined>();
	const [draggedTreeNodeId, setDraggedTreeNodeId] = createSignal<string | undefined>();
	const [activeDropPlacement, setActiveDropPlacement] = createSignal<EditableBtDropPlacement | undefined>();
	const [dragPreview, setDragPreview] = createSignal<DragPreview | undefined>();

	const createDragPreviewKey = (type: EditableBtNodeType, placement: EditableBtDropPlacement): string =>
		`${draggedTreeNodeId() ? `tree:${draggedTreeNodeId()}` : "library"}:${type}:${placement.targetNodeId}:${placement.intent}`;

	const startLibraryNodeDrag = (type: EditableBtNodeType) => {
		if (options.isReadOnly()) return;
		setDraggedNodeType(type);
		setDraggedTreeNodeId(undefined);
		setDragPreview(undefined);
	};

	const startTreeNodeDrag = (nodeId: string) => {
		if (options.isReadOnly()) return;
		const node = findEditableNode(options.getActiveTree(), nodeId);
		if (!node || node.type === "root" || node.isPlaceholder) return;
		options.onSelectNode(nodeId);
		setDraggedNodeType(node.type);
		setDraggedTreeNodeId(nodeId);
		setActiveDropPlacement(undefined);
		setDragPreview(undefined);
	};

	const clearNodeDrag = () => {
		setDraggedNodeType(undefined);
		setDraggedTreeNodeId(undefined);
		setActiveDropPlacement(undefined);
		setDragPreview(undefined);
	};

	const clearDanglingNodeDrag = () => {
		if (!draggedNodeType()) return;
		clearNodeDrag();
	};

	const updateNodeDropPreview = (placement: EditableBtDropPlacement | null) => {
		const type = draggedNodeType();
		if (!type || !placement || options.isReadOnly()) {
			setActiveDropPlacement(undefined);
			setDragPreview(undefined);
			return;
		}
		const key = createDragPreviewKey(type, placement);
		if (dragPreview()?.key === key) return;
		const sourceNodeId = draggedTreeNodeId();
		const result = sourceNodeId
			? moveNodeByDropPlacement(options.getActiveTree(), sourceNodeId, placement, { placeholder: true })
			: insertNodeByDropPlacement(options.getActiveTree(), type, placement, { placeholder: true });
		if (!result) {
			setActiveDropPlacement(undefined);
			setDragPreview(undefined);
			return;
		}
		setActiveDropPlacement(placement);
		setDragPreview({ key, tree: result.tree, nodeId: result.nodeId });
	};

	const commitNodeDrop = (placement: EditableBtDropPlacement | null) => {
		const type = draggedNodeType();
		if (!type || !placement || options.isReadOnly()) {
			clearNodeDrag();
			return;
		}
		const key = createDragPreviewKey(type, placement);
		const preview = dragPreview();
		const sourceNodeId = draggedTreeNodeId();
		const result =
			preview?.key === key
				? materializePlaceholderTree(preview.tree)
				: sourceNodeId
					? moveNodeByDropPlacement(options.getActiveTree(), sourceNodeId, placement)
					: insertNodeByDropPlacement(options.getActiveTree(), type, placement);
		if (!result) {
			clearNodeDrag();
			return;
		}
		options.onTreeChange(result.tree);
		if (result.nodeId) {
			options.onSelectNode(result.nodeId);
			options.onOpenInspector();
		}
		clearNodeDrag();
	};

	const canDropOnNode = (id: string) => {
		const sourceNodeId = draggedTreeNodeId();
		return !sourceNodeId || (id !== sourceNodeId && !isEditableNodeDescendant(options.getActiveTree(), sourceNodeId, id));
	};

	return {
		draggedNodeType,
		draggedTreeNodeId,
		activeDropPlacement,
		dragPreview,
		startLibraryNodeDrag,
		startTreeNodeDrag,
		clearNodeDrag,
		clearDanglingNodeDrag,
		updateNodeDropPreview,
		commitNodeDrop,
		canDropOnNode,
	};
}
