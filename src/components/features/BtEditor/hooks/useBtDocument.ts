import { createMemo, createSignal } from "solid-js";
import {
	addEditableRoot,
	cloneEditableDocument,
	createDefaultEditableDocument,
	deleteEditableRoot,
	type EditableBtDocument,
	type EditableBtTree,
	editableDocumentFromDefinition,
	editableDocumentToDefinitionText,
	findEditableNode,
	getActiveEditableRoot,
	getActiveEditableTree,
	renameEditableRoot,
	setActiveEditableRootKey,
	updateActiveEditableTree,
} from "../model/editableTree";

export type EditableBtDocumentParseResult = {
	document: EditableBtDocument;
	error: string;
};

export const getPreferredSelectionId = (tree: EditableBtTree): string => tree.root.children[0]?.id ?? tree.root.id;

export function parseInitialEditableDocument(definition: string): EditableBtDocumentParseResult {
	try {
		return { document: editableDocumentFromDefinition(definition), error: "" };
	} catch (error) {
		return {
			document: createDefaultEditableDocument(),
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export function createNextRootName(document: EditableBtDocument): string {
	const names = new Set(document.roots.map((root) => root.name).filter((name): name is string => !!name));
	let index = 1;
	while (names.has(`subtree${index}`)) index += 1;
	return `subtree${index}`;
}

/**
 * 管理编辑器文档和当前选择。
 *
 * 设计说明：root 切换、文本导入和结构编辑都收敛为 EditableBtDocument 变更，避免单 root 状态与多 root 定义分叉。
 */
export function useBtDocument(initialDocument: EditableBtDocument) {
	const [editableDocument, setEditableDocument] = createSignal<EditableBtDocument>(initialDocument);
	const [selectedNodeId, setSelectedNodeId] = createSignal<string | undefined>(
		getPreferredSelectionId(getActiveEditableTree(initialDocument)),
	);

	const activeRoot = createMemo(() => getActiveEditableRoot(editableDocument()));
	const activeTree = createMemo(() => getActiveEditableTree(editableDocument()));
	const definition = createMemo(() => editableDocumentToDefinitionText(editableDocument()));
	const selectedNode = createMemo(() => {
		const id = selectedNodeId();
		return id ? findEditableNode(activeTree(), id) : undefined;
	});

	const replaceDocument = (document: EditableBtDocument, nextSelectedNodeId?: string) => {
		const nextDocument = cloneEditableDocument(document);
		setEditableDocument(nextDocument);
		setSelectedNodeId(nextSelectedNodeId ?? getPreferredSelectionId(getActiveEditableTree(nextDocument)));
		return nextDocument;
	};

	const replaceDocumentPreservingSelection = (document: EditableBtDocument) => {
		setEditableDocument(cloneEditableDocument(document));
	};

	const replaceActiveTree = (tree: EditableBtTree) =>
		replaceDocumentPreservingSelection(updateActiveEditableTree(editableDocument(), () => tree));

	const switchActiveRoot = (rootKey: string) =>
		replaceDocument(setActiveEditableRootKey(editableDocument(), rootKey));

	const renameRoot = (rootKey: string, name: string) =>
		replaceDocumentPreservingSelection(renameEditableRoot(editableDocument(), rootKey, name));

	const addNamedRoot = () => replaceDocument(addEditableRoot(editableDocument(), createNextRootName(editableDocument())));

	const deleteNamedRoot = (rootKey: string) => replaceDocument(deleteEditableRoot(editableDocument(), rootKey));

	return {
		editableDocument,
		activeRoot,
		activeTree,
		definition,
		selectedNode,
		selectedNodeId,
		setSelectedNodeId,
		replaceDocument,
		replaceDocumentPreservingSelection,
		replaceActiveTree,
		switchActiveRoot,
		renameRoot,
		addNamedRoot,
		deleteNamedRoot,
	};
}
