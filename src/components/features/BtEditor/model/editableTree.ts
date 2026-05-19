import { convertMDSLToJSON, validateDefinition } from "~/lib/mistreevous";
import type {
	AnyChildNodeDefinition,
	NodeArgument,
	NodeAttributeDefinition,
	NodeGuardDefinition,
	RootNodeDefinition,
} from "~/lib/mistreevous/BehaviourTreeDefinition";
import { State } from "~/lib/mistreevous/State";
import type { NodeType } from "../types/workflow";

export type EditableBtNodeType =
	| "root"
	| "sequence"
	| "selector"
	| "parallel"
	| "race"
	| "all"
	| "lotto"
	| "repeat"
	| "retry"
	| "flip"
	| "succeed"
	| "fail"
	| "action"
	| "condition"
	| "wait"
	| "branch";

export type EditableBtAttribute = {
	call: string;
	args: NodeArgument[];
	succeedOnAbort?: boolean;
};

export type EditableBtNode = {
	id: string;
	type: EditableBtNodeType;
	isPlaceholder?: boolean;
	call?: string;
	args: NodeArgument[];
	duration?: number | { $: string } | [number | { $: string }, number | { $: string }];
	ref?: string;
	iterations?: number | [number, number];
	attempts?: number | [number, number];
	weights?: Array<number | { $: string }>;
	entry?: EditableBtAttribute;
	step?: EditableBtAttribute;
	exit?: EditableBtAttribute;
	while?: EditableBtAttribute;
	until?: EditableBtAttribute;
	children: EditableBtNode[];
};

export type EditableBtTree = {
	root: EditableBtNode;
};

export type EditableBtRoot = {
	key: string;
	name?: string;
	tree: EditableBtTree;
};

export type EditableBtDocument = {
	roots: EditableBtRoot[];
	activeRootKey: string;
};

export type EditableBtDropIntent = "child" | "before" | "after" | "parent";

export type EditableBtDropPlacement = {
	targetNodeId: string;
	intent: EditableBtDropIntent;
};

export const COMPOSITE_NODE_TYPES = new Set<EditableBtNodeType>([
	"sequence",
	"selector",
	"parallel",
	"race",
	"all",
	"lotto",
]);
export const DECORATOR_NODE_TYPES = new Set<EditableBtNodeType>(["root", "repeat", "retry", "flip", "succeed", "fail"]);
export const LEAF_NODE_TYPES = new Set<EditableBtNodeType>(["action", "condition", "wait", "branch"]);

let nodeCounter = 0;

export function createEditableNodeId(): string {
	nodeCounter += 1;
	return `bt-node-${Date.now().toString(36)}-${nodeCounter.toString(36)}`;
}

export function createEditableRootKey(): string {
	nodeCounter += 1;
	return `bt-root-${Date.now().toString(36)}-${nodeCounter.toString(36)}`;
}

export function createDefaultEditableTree(): EditableBtTree {
	return {
		root: {
			id: createEditableNodeId(),
			type: "root",
			args: [],
			children: [createDefaultNode("sequence")],
		},
	};
}

export function createDefaultEditableDocument(): EditableBtDocument {
	const root = createEditableRoot(undefined, createDefaultEditableTree());
	return {
		roots: [root],
		activeRootKey: root.key,
	};
}

export function createEditableRoot(name?: string, tree: EditableBtTree = createDefaultEditableTree()): EditableBtRoot {
	return {
		key: createEditableRootKey(),
		name: normalizeRootName(name),
		tree,
	};
}

export function getEditableRootDisplayName(root: EditableBtRoot): string {
	return root.name?.trim() || "主树";
}

export function getActiveEditableRoot(document: EditableBtDocument): EditableBtRoot {
	return (
		document.roots.find((root) => root.key === document.activeRootKey) ??
		document.roots[0] ??
		createEditableRoot(undefined, createDefaultEditableTree())
	);
}

export function getActiveEditableTree(document: EditableBtDocument): EditableBtTree {
	return getActiveEditableRoot(document).tree;
}

export function setActiveEditableRootKey(document: EditableBtDocument, rootKey: string): EditableBtDocument {
	if (!document.roots.some((root) => root.key === rootKey)) return document;
	return { ...document, activeRootKey: rootKey };
}

export function updateActiveEditableTree(
	document: EditableBtDocument,
	updater: (tree: EditableBtTree) => EditableBtTree,
): EditableBtDocument {
	const activeKey = getActiveEditableRoot(document).key;
	return {
		...document,
		activeRootKey: activeKey,
		roots: document.roots.map((root) => (root.key === activeKey ? { ...root, tree: updater(root.tree) } : root)),
	};
}

export function renameEditableRoot(document: EditableBtDocument, rootKey: string, name: string): EditableBtDocument {
	return {
		...document,
		roots: document.roots.map((root) => (root.key === rootKey ? { ...root, name: normalizeRootName(name) } : root)),
	};
}

export function addEditableRoot(document: EditableBtDocument, name: string): EditableBtDocument {
	const root = createEditableRoot(name);
	return {
		roots: [...document.roots, root],
		activeRootKey: root.key,
	};
}

export function deleteEditableRoot(document: EditableBtDocument, rootKey: string): EditableBtDocument {
	if (document.roots.length <= 1) return document;
	const roots = document.roots.filter((root) => root.key !== rootKey);
	const activeRootKey = document.activeRootKey === rootKey ? roots[0]?.key : document.activeRootKey;
	return {
		roots,
		activeRootKey: activeRootKey ?? roots[0]?.key ?? createEditableRootKey(),
	};
}

export function createDefaultNode(type: EditableBtNodeType): EditableBtNode {
	const base: EditableBtNode = {
		id: createEditableNodeId(),
		type,
		args: [],
		children: [],
	};

	if (type === "root") {
		base.children = [createDefaultNode("sequence")];
	}
	if (COMPOSITE_NODE_TYPES.has(type)) {
		base.children = [createDefaultNode("action")];
	}
	if (DECORATOR_NODE_TYPES.has(type) && type !== "root") {
		base.children = [createDefaultNode("action")];
	}
	if (type === "action") {
		base.call = "SomeAction";
	}
	if (type === "condition") {
		base.call = "SomeCondition";
	}
	if (type === "wait") {
		base.duration = 1000;
	}
	if (type === "branch") {
		base.ref = "subtree";
	}

	return base;
}

/**
 * 设计说明：节点类型切换必须同时收敛字段形态，并保持单棵树只有一个 root。
 */
export function retargetEditableNode(node: EditableBtNode, type: EditableBtNodeType): EditableBtNode {
	if (node.type === "root" || type === "root") return node;
	const defaults = createDefaultNode(type);
	const existingChildren = node.children.length > 0 ? node.children.map(cloneEditableNode) : defaults.children;
	const normalized: EditableBtNode = {
		id: node.id,
		type,
		args: [],
		entry: node.entry ? cloneAttribute(node.entry) : undefined,
		step: node.step ? cloneAttribute(node.step) : undefined,
		exit: node.exit ? cloneAttribute(node.exit) : undefined,
		while: node.while ? cloneAttribute(node.while) : undefined,
		until: node.until ? cloneAttribute(node.until) : undefined,
		children: LEAF_NODE_TYPES.has(type)
			? []
			: DECORATOR_NODE_TYPES.has(type)
				? [existingChildren[0] ?? createDefaultNode("action")]
				: existingChildren,
	};

	if (type === "action" || type === "condition") {
		normalized.call = node.call ?? defaults.call;
		normalized.args = node.args ?? [];
	}
	if (type === "wait") {
		normalized.duration = node.duration ?? defaults.duration;
	}
	if (type === "branch") {
		normalized.ref = node.ref ?? defaults.ref;
	}
	if (type === "repeat") {
		normalized.iterations = node.iterations ?? defaults.iterations;
	}
	if (type === "retry") {
		normalized.attempts = node.attempts ?? defaults.attempts;
	}
	if (type === "lotto") {
		normalized.weights = node.weights ? [...node.weights] : defaults.weights;
	}

	return normalized;
}

export function cloneEditableTree(tree: EditableBtTree): EditableBtTree {
	return { root: cloneEditableNode(tree.root) };
}

export function cloneEditableDocument(document: EditableBtDocument): EditableBtDocument {
	return {
		activeRootKey: document.activeRootKey,
		roots: document.roots.map((root) => ({
			key: root.key,
			name: root.name,
			tree: cloneEditableTree(root.tree),
		})),
	};
}

export function cloneEditableNode(node: EditableBtNode): EditableBtNode {
	return {
		...node,
		args: [...node.args],
		weights: node.weights ? [...node.weights] : undefined,
		entry: cloneAttribute(node.entry),
		step: cloneAttribute(node.step),
		exit: cloneAttribute(node.exit),
		while: cloneAttribute(node.while),
		until: cloneAttribute(node.until),
		children: node.children.map(cloneEditableNode),
	};
}

export function duplicateEditableNode(node: EditableBtNode): EditableBtNode {
	const duplicated = cloneEditableNode(node);
	assignFreshIds(duplicated);
	return duplicated;
}

function assignFreshIds(node: EditableBtNode): void {
	node.id = createEditableNodeId();
	for (const child of node.children) {
		assignFreshIds(child);
	}
}

function cloneAttribute(attribute?: EditableBtAttribute): EditableBtAttribute | undefined {
	if (!attribute) return undefined;
	return {
		...attribute,
		args: [...attribute.args],
	};
}

export function editableTreeFromDefinition(definition: string): EditableBtTree {
	return getActiveEditableTree(editableDocumentFromDefinition(definition));
}

export function editableDocumentFromDefinition(definition: string): EditableBtDocument {
	const trimmed = definition.trim();
	if (!trimmed) return createDefaultEditableDocument();

	let roots: RootNodeDefinition[];
	try {
		const parsed = JSON.parse(trimmed);
		const result = validateDefinition(parsed);
		if (!result.succeeded || !result.json) {
			throw new Error(result.errorMessage ?? "JSON 定义无效");
		}
		roots = result.json;
	} catch (jsonError) {
		try {
			roots = convertMDSLToJSON(trimmed);
		} catch {
			throw jsonError;
		}
	}

	const editableRoots = roots.map((rootDefinition) =>
		createEditableRoot(rootDefinition.id, { root: editableNodeFromDefinition(rootDefinition) }),
	);
	const primaryRoot = editableRoots.find((root) => root.name === undefined) ?? editableRoots[0];
	if (!primaryRoot) return createDefaultEditableDocument();
	return {
		roots: editableRoots,
		activeRootKey: primaryRoot.key,
	};
}

export function editableNodeFromDefinition(definition: RootNodeDefinition | AnyChildNodeDefinition): EditableBtNode {
	const node: EditableBtNode = {
		id: createEditableNodeId(),
		type: definition.type as EditableBtNodeType,
		args: [],
		entry: attributeFromDefinition(definition.entry),
		step: attributeFromDefinition(definition.step),
		exit: attributeFromDefinition(definition.exit),
		while: attributeFromDefinition(definition.while),
		until: attributeFromDefinition(definition.until),
		children: [],
	};

	if (definition.type === "action" || definition.type === "condition") {
		node.call = definition.call;
		node.args = definition.args ? [...definition.args] : [];
	}
	if (definition.type === "wait") {
		node.duration = definition.duration;
	}
	if (definition.type === "branch") {
		node.ref = definition.ref;
	}
	if (definition.type === "repeat") {
		node.iterations = definition.iterations;
	}
	if (definition.type === "retry") {
		node.attempts = definition.attempts;
	}
	if (definition.type === "lotto") {
		node.weights = definition.weights ? [...definition.weights] : undefined;
	}
	if ("children" in definition) {
		node.children = definition.children.map(editableNodeFromDefinition);
	}
	if ("child" in definition) {
		node.children = [editableNodeFromDefinition(definition.child)];
	}

	return node;
}

export function editableTreeToRootDefinition(tree: EditableBtTree): RootNodeDefinition {
	return editableNodeToDefinition(tree.root) as RootNodeDefinition;
}

export function editableDocumentToRootDefinitions(document: EditableBtDocument): RootNodeDefinition[] {
	return document.roots.map(editableRootToDefinition);
}

export function editableRootToDefinition(root: EditableBtRoot): RootNodeDefinition {
	const definition = editableTreeToRootDefinition(root.tree);
	if (root.name) return { ...definition, id: root.name };
	const { id: _id, ...primaryDefinition } = definition;
	return primaryDefinition as RootNodeDefinition;
}

export function editableNodeToDefinition(node: EditableBtNode): RootNodeDefinition | AnyChildNodeDefinition {
	const base: Record<string, unknown> = {
		type: node.type,
	};

	applyAttributes(base, node);

	if (node.type === "action") {
		return withOptionalArgs({ ...base, call: node.call?.trim() || "SomeAction" }, node.args) as AnyChildNodeDefinition;
	}
	if (node.type === "condition") {
		return withOptionalArgs(
			{ ...base, call: node.call?.trim() || "SomeCondition" },
			node.args,
		) as AnyChildNodeDefinition;
	}
	if (node.type === "wait") {
		if (node.duration !== undefined) {
			base.duration = node.duration;
		}
		return base as unknown as AnyChildNodeDefinition;
	}
	if (node.type === "branch") {
		return { ...base, ref: node.ref?.trim() || "subtree" } as AnyChildNodeDefinition;
	}
	if (node.type === "repeat" && node.iterations !== undefined) {
		base.iterations = node.iterations;
	}
	if (node.type === "retry" && node.attempts !== undefined) {
		base.attempts = node.attempts;
	}
	if (node.type === "lotto" && node.weights?.length) {
		base.weights = node.weights;
	}

	if (COMPOSITE_NODE_TYPES.has(node.type)) {
		base.children = node.children.map((child) => editableNodeToDefinition(child));
		return base as unknown as AnyChildNodeDefinition;
	}

	const child = node.children[0];
	if (child) {
		base.child = editableNodeToDefinition(child);
	}
	return base as unknown as RootNodeDefinition | AnyChildNodeDefinition;
}

export function editableTreeToDefinitionText(tree: EditableBtTree): string {
	return JSON.stringify(editableTreeToRootDefinition(tree), null, "\t");
}

export function editableDocumentToDefinitionText(document: EditableBtDocument): string {
	const definitions = editableDocumentToRootDefinitions(document);
	return JSON.stringify(definitions.length === 1 ? definitions[0] : definitions, null, "\t");
}

export function findEditableNode(tree: EditableBtTree, id: string): EditableBtNode | undefined {
	return findNodeInSubtree(tree.root, id);
}

export function isEditableNodeDescendant(tree: EditableBtTree, ancestorId: string, nodeId: string): boolean {
	const ancestor = findEditableNode(tree, ancestorId);
	return ancestor ? containsNodeId(ancestor.children, nodeId) : false;
}

function findNodeInSubtree(node: EditableBtNode, id: string): EditableBtNode | undefined {
	if (node.id === id) return node;
	for (const child of node.children) {
		const found = findNodeInSubtree(child, id);
		if (found) return found;
	}
	return undefined;
}

function containsNodeId(nodes: EditableBtNode[], id: string): boolean {
	for (const node of nodes) {
		if (node.id === id || containsNodeId(node.children, id)) return true;
	}
	return false;
}

export function updateEditableNode(
	tree: EditableBtTree,
	id: string,
	updater: (node: EditableBtNode) => EditableBtNode,
): EditableBtTree {
	return { root: updateNodeInSubtree(tree.root, id, updater) };
}

function updateNodeInSubtree(
	node: EditableBtNode,
	id: string,
	updater: (node: EditableBtNode) => EditableBtNode,
): EditableBtNode {
	if (node.id === id) return updater(cloneEditableNode(node));
	return {
		...node,
		children: node.children.map((child) => updateNodeInSubtree(child, id, updater)),
	};
}

export function addChildNode(tree: EditableBtTree, parentId: string, type: EditableBtNodeType): EditableBtTree {
	return updateEditableNode(tree, parentId, (node) => {
		const next = cloneEditableNode(node);
		const child = createDefaultNode(type);
		if (DECORATOR_NODE_TYPES.has(next.type)) {
			next.children = [child];
		} else if (!LEAF_NODE_TYPES.has(next.type)) {
			next.children.push(child);
		}
		return next;
	});
}

/**
 * 设计说明：节点库的“添加”不能隐式删除现有子树；单子节点容器需要容纳多个节点时用 sequence 承载顺序。
 */
export function addNodeAtSelection(
	tree: EditableBtTree,
	selectedNodeId: string,
	type: EditableBtNodeType,
): { tree: EditableBtTree; nodeId: string } {
	const child = createDefaultNode(type);
	const result = addNodeInSubtree(tree.root, selectedNodeId, child);
	if (result.inserted) {
		return { tree: { root: result.node }, nodeId: child.id };
	}
	return { tree: { root: addChildWithoutDroppingSubtree(tree.root, child) }, nodeId: child.id };
}

/**
 * 设计说明：拖放新增按“目标节点 + 方位”落点写入树结构；占位预览与正式提交走同一套插入规则。
 */
export function insertNodeByDropPlacement(
	tree: EditableBtTree,
	type: EditableBtNodeType,
	placement: EditableBtDropPlacement,
	options: { placeholder?: boolean } = {},
): { tree: EditableBtTree; nodeId: string } {
	const child = createDefaultNode(type);
	child.isPlaceholder = options.placeholder;
	return insertPreparedNodeByDropPlacement(tree, child, placement);
}

/**
 * 设计说明：树内拖动是移动现有子树，必须保留节点 id 和参数；目标在自身子树内时会形成环，直接拒绝。
 */
export function moveNodeByDropPlacement(
	tree: EditableBtTree,
	sourceNodeId: string,
	placement: EditableBtDropPlacement,
	options: { placeholder?: boolean } = {},
): { tree: EditableBtTree; nodeId: string } | null {
	if (tree.root.id === sourceNodeId) return null;
	if (sourceNodeId === placement.targetNodeId || isEditableNodeDescendant(tree, sourceNodeId, placement.targetNodeId)) {
		return null;
	}

	const source = findEditableNode(tree, sourceNodeId);
	if (!source) return null;
	const moved = cloneEditableNode(source);
	moved.isPlaceholder = options.placeholder;
	const treeWithoutSource = deleteEditableNode(tree, sourceNodeId);
	if (!findEditableNode(treeWithoutSource, placement.targetNodeId)) return null;
	return insertPreparedNodeByDropPlacement(treeWithoutSource, moved, placement);
}

function insertPreparedNodeByDropPlacement(
	tree: EditableBtTree,
	child: EditableBtNode,
	placement: EditableBtDropPlacement,
): { tree: EditableBtTree; nodeId: string } {
	const normalizedIntent = normalizeDropIntent(tree, placement, child.type);

	if (normalizedIntent === "child") {
		return insertChildByDropTarget(tree, placement.targetNodeId, child);
	}
	if (normalizedIntent === "parent") {
		return wrapDropTarget(tree, placement.targetNodeId, child);
	}
	return insertSiblingByDropTarget(tree, placement.targetNodeId, child, normalizedIntent);
}

export function materializePlaceholderTree(tree: EditableBtTree): { tree: EditableBtTree; nodeId?: string } {
	let nodeId: string | undefined;
	const visit = (node: EditableBtNode): EditableBtNode => {
		if (node.isPlaceholder) {
			nodeId = node.id;
		}
		return {
			...node,
			isPlaceholder: undefined,
			children: node.children.map(visit),
		};
	};
	return { tree: { root: visit(tree.root) }, nodeId };
}

function normalizeDropIntent(
	tree: EditableBtTree,
	placement: EditableBtDropPlacement,
	type: EditableBtNodeType,
): EditableBtDropIntent {
	const target = findEditableNode(tree, placement.targetNodeId);
	if (!target || target.type === "root") return "child";
	if (placement.intent === "parent" && LEAF_NODE_TYPES.has(type)) return "before";
	if (placement.intent === "child" && LEAF_NODE_TYPES.has(target.type)) return "after";
	return placement.intent;
}

function insertChildByDropTarget(
	tree: EditableBtTree,
	targetNodeId: string,
	child: EditableBtNode,
): { tree: EditableBtTree; nodeId: string } {
	const result = addNodeInSubtree(tree.root, targetNodeId, child);
	if (result.inserted) return { tree: { root: result.node }, nodeId: child.id };
	return { tree, nodeId: child.id };
}

function insertSiblingByDropTarget(
	tree: EditableBtTree,
	targetNodeId: string,
	child: EditableBtNode,
	intent: "before" | "after",
): { tree: EditableBtTree; nodeId: string } {
	if (tree.root.id === targetNodeId) {
		return insertChildByDropTarget(tree, targetNodeId, child);
	}
	return { tree: { root: insertSiblingInSubtree(tree.root, targetNodeId, child, intent) }, nodeId: child.id };
}

function insertSiblingInSubtree(
	node: EditableBtNode,
	targetNodeId: string,
	child: EditableBtNode,
	intent: "before" | "after",
): EditableBtNode {
	const targetIndex = node.children.findIndex((current) => current.id === targetNodeId);
	if (targetIndex >= 0) {
		if (COMPOSITE_NODE_TYPES.has(node.type)) {
			const children = [...node.children];
			children.splice(intent === "before" ? targetIndex : targetIndex + 1, 0, child);
			return { ...node, children };
		}
		const target = node.children[targetIndex];
		const wrapper = intent === "before" ? createSequenceWrapper(child, target) : createSequenceWrapper(target, child);
		return {
			...node,
			children: node.children.map((current, index) => (index === targetIndex ? wrapper : current)),
		};
	}
	return {
		...node,
		children: node.children.map((current) => insertSiblingInSubtree(current, targetNodeId, child, intent)),
	};
}

function wrapDropTarget(
	tree: EditableBtTree,
	targetNodeId: string,
	wrapper: EditableBtNode,
): { tree: EditableBtTree; nodeId: string } {
	if (tree.root.id === targetNodeId) return insertChildByDropTarget(tree, targetNodeId, wrapper);
	return { tree: { root: wrapDropTargetInSubtree(tree.root, targetNodeId, wrapper) }, nodeId: wrapper.id };
}

function wrapDropTargetInSubtree(node: EditableBtNode, targetNodeId: string, wrapper: EditableBtNode): EditableBtNode {
	return {
		...node,
		children: node.children.map((child) => {
			if (child.id !== targetNodeId) return wrapDropTargetInSubtree(child, targetNodeId, wrapper);
			return {
				...wrapper,
				children: [child],
			};
		}),
	};
}

function addNodeInSubtree(
	node: EditableBtNode,
	selectedNodeId: string,
	child: EditableBtNode,
): { node: EditableBtNode; inserted: boolean } {
	if (node.id === selectedNodeId) {
		if (DECORATOR_NODE_TYPES.has(node.type) || COMPOSITE_NODE_TYPES.has(node.type)) {
			const next = addChildWithoutDroppingSubtree(node, child);
			return { node: next, inserted: true };
		}
		return { node: cloneEditableNode(node), inserted: false };
	}

	let inserted = false;
	const children: EditableBtNode[] = [];
	for (const currentChild of node.children) {
		const result = addNodeInSubtree(currentChild, selectedNodeId, child);
		children.push(result.node);
		if (result.inserted) {
			inserted = true;
			continue;
		}
		if (currentChild.id === selectedNodeId && COMPOSITE_NODE_TYPES.has(node.type)) {
			children.push(child);
			inserted = true;
			continue;
		}
		if (currentChild.id === selectedNodeId && DECORATOR_NODE_TYPES.has(node.type)) {
			children[children.length - 1] = createSequenceWrapper(result.node, child);
			inserted = true;
		}
	}

	return { node: { ...node, children }, inserted };
}

function addChildWithoutDroppingSubtree(node: EditableBtNode, child: EditableBtNode): EditableBtNode {
	const next = cloneEditableNode(node);
	if (COMPOSITE_NODE_TYPES.has(next.type)) {
		next.children = [...next.children, child];
		return next;
	}
	const existingChild = next.children[0];
	if (!existingChild) {
		next.children = [child];
		return next;
	}
	if (COMPOSITE_NODE_TYPES.has(existingChild.type)) {
		next.children = [addChildWithoutDroppingSubtree(existingChild, child)];
		return next;
	}
	next.children = [createSequenceWrapper(existingChild, child)];
	return next;
}

function createSequenceWrapper(firstChild: EditableBtNode, secondChild: EditableBtNode): EditableBtNode {
	const wrapper = createDefaultNode("sequence");
	wrapper.children = [firstChild, secondChild];
	return wrapper;
}

export function deleteEditableNode(tree: EditableBtTree, id: string): EditableBtTree {
	if (tree.root.id === id) return tree;
	return { root: deleteNodeFromSubtree(tree.root, id) };
}

function deleteNodeFromSubtree(node: EditableBtNode, id: string): EditableBtNode {
	return {
		...node,
		children: node.children.filter((child) => child.id !== id).map((child) => deleteNodeFromSubtree(child, id)),
	};
}

export function duplicateChildNode(tree: EditableBtTree, id: string): EditableBtTree {
	if (tree.root.id === id) return tree;
	return { root: duplicateInSubtree(tree.root, id) };
}

function duplicateInSubtree(node: EditableBtNode, id: string): EditableBtNode {
	const children: EditableBtNode[] = [];
	for (const child of node.children) {
		children.push(duplicateInSubtree(child, id));
		if (child.id === id && COMPOSITE_NODE_TYPES.has(node.type)) {
			children.push(duplicateEditableNode(child));
		}
	}
	return { ...node, children };
}

export function moveEditableNode(tree: EditableBtTree, id: string, direction: -1 | 1): EditableBtTree {
	return { root: moveNodeInSubtree(tree.root, id, direction) };
}

function moveNodeInSubtree(node: EditableBtNode, id: string, direction: -1 | 1): EditableBtNode {
	const children = node.children.map((child) => moveNodeInSubtree(child, id, direction));
	const index = children.findIndex((child) => child.id === id);
	if (index >= 0) {
		const target = index + direction;
		if (target >= 0 && target < children.length) {
			const tmp = children[index];
			children[index] = children[target];
			children[target] = tmp;
		}
	}
	return { ...node, children };
}

export function createCanvasElementsFromEditableTree(
	tree: EditableBtTree,
	selectedNodeId?: string,
	runtimeStates: Record<string, State> = {},
): {
	nodes: NodeType[];
	edges: Array<{ id: string; from: string; to: string; variant: "default" | "active" | "succeeded" | "failed" }>;
} {
	const nodes: NodeType[] = [];
	const edges: Array<{ id: string; from: string; to: string; variant: "default" | "active" | "succeeded" | "failed" }> =
		[];

	const visit = (node: EditableBtNode, path: string, parentId?: string) => {
		const nodeState = runtimeStates[path] ?? State.READY;
		nodes.push({
			id: node.id,
			caption: getEditableNodeCaption(node),
			state: nodeState,
			type: node.type,
			args: getNodeDisplayArgs(node),
			whileGuard: node.while ? toDisplayGuard(node.while) : undefined,
			untilGuard: node.until ? toDisplayGuard(node.until) : undefined,
			entryCallback: node.entry ? toDisplayCallback(node.entry) : undefined,
			stepCallback: node.step ? toDisplayCallback(node.step) : undefined,
			exitCallback: node.exit ? toDisplayCallback(node.exit) : undefined,
			isPlaceholder: node.isPlaceholder,
			variant: selectedNodeId === node.id ? "selected" : "default",
		});
		if (parentId) {
			edges.push({
				id: `${parentId}_${node.id}`,
				from: parentId,
				to: node.id,
				variant: stateToConnectorVariant(nodeState),
			});
		}
		for (const [index, child] of node.children.entries()) {
			visit(child, `${path}.${index}`, node.id);
		}
	};

	visit(tree.root, "0");
	return { nodes, edges };
}

function stateToConnectorVariant(state: State): "default" | "active" | "succeeded" | "failed" {
	if (state === State.RUNNING) return "active";
	if (state === State.SUCCEEDED) return "succeeded";
	if (state === State.FAILED) return "failed";
	return "default";
}

export function getEditableNodeCaption(node: EditableBtNode): string {
	switch (node.type) {
		case "root":
			return "根节点";
		case "sequence":
			return "顺序执行";
		case "selector":
			return "选择执行";
		case "parallel":
			return "同时执行";
		case "race":
			return "竞争执行";
		case "all":
			return "全部执行";
		case "lotto":
			return "随机执行";
		case "repeat":
			return "重复执行";
		case "retry":
			return "重试";
		case "flip":
			return "反转节点";
		case "succeed":
			return "成功节点";
		case "fail":
			return "失败节点";
		case "action":
			return `动作 ${node.call ?? ""}`.trim();
		case "condition":
			return `条件 ${node.call ?? ""}`.trim();
		case "wait":
			return `等待 ${formatArgument(node.duration ?? 1000)}ms`;
		case "branch":
			return `子树 ${node.ref ?? ""}`.trim();
	}
}

export function parseNodeArgument(raw: string): NodeArgument {
	const value = raw.trim();
	if (!value) return "";
	if (value.startsWith("$")) return { $: value.slice(1) };
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "null") return null;
	if (!Number.isNaN(Number(value))) return Number(value);
	return value.replace(/^"|"$/g, "");
}

export function formatArgument(arg: unknown): string {
	if (typeof arg === "object" && arg !== null && "$" in arg) {
		return `$${String((arg as { $: unknown }).$)}`;
	}
	if (typeof arg === "string") return arg;
	if (arg === null) return "null";
	if (arg === undefined) return "";
	return String(arg);
}

function getNodeDisplayArgs(node: EditableBtNode): NodeArgument[] {
	if (node.type === "action" || node.type === "condition") return node.args;
	if (node.type === "wait")
		return [node.duration as NodeArgument].filter((arg): arg is NodeArgument => arg !== undefined);
	if (node.type === "branch") return node.ref ? [node.ref] : [];
	return [];
}

function attributeFromDefinition(
	attribute?: NodeAttributeDefinition | NodeGuardDefinition,
): EditableBtAttribute | undefined {
	if (!attribute) return undefined;
	return {
		call: attribute.call,
		args: attribute.args ? [...attribute.args] : [],
		succeedOnAbort: "succeedOnAbort" in attribute ? attribute.succeedOnAbort : undefined,
	};
}

function applyAttributes(target: Record<string, unknown>, node: EditableBtNode): void {
	if (node.entry) target.entry = attributeToDefinition(node.entry);
	if (node.step) target.step = attributeToDefinition(node.step);
	if (node.exit) target.exit = attributeToDefinition(node.exit);
	if (node.while) target.while = attributeToDefinition(node.while, true);
	if (node.until) target.until = attributeToDefinition(node.until, true);
}

function attributeToDefinition(
	attribute: EditableBtAttribute,
	guard = false,
): NodeAttributeDefinition | NodeGuardDefinition {
	const result: NodeAttributeDefinition | NodeGuardDefinition = {
		call: attribute.call,
	};
	if (attribute.args.length) {
		result.args = [...attribute.args];
	}
	if (guard && attribute.succeedOnAbort !== undefined) {
		(result as NodeGuardDefinition).succeedOnAbort = attribute.succeedOnAbort;
	}
	return result;
}

function withOptionalArgs<T extends Record<string, unknown>>(target: T, args: NodeArgument[]): T {
	if (args.length) {
		return {
			...target,
			args: [...args],
		};
	}
	return target;
}

function ensureChildren(node: EditableBtNode): EditableBtNode[] {
	if (node.children.length > 0) return node.children;
	return [createDefaultNode("action")];
}

function toDisplayCallback(attribute: EditableBtAttribute): NonNullable<NodeType["entryCallback"]> {
	return {
		type: "callback",
		calls: attribute.call,
		args: attribute.args,
	};
}

function toDisplayGuard(attribute: EditableBtAttribute): NonNullable<NodeType["whileGuard"]> {
	return {
		type: "guard",
		calls: attribute.call,
		args: attribute.args,
		succeedOnAbort: !!attribute.succeedOnAbort,
	};
}

function normalizeRootName(name?: string): string | undefined {
	const trimmed = name?.trim();
	return trimmed ? trimmed : undefined;
}
