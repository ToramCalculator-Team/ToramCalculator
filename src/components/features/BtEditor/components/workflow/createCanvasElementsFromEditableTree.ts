import type { NodeArgument } from "~/lib/mistreevous/BehaviourTreeDefinition";
import { State } from "~/lib/mistreevous/State";
import {
	type EditableBtAttribute,
	type EditableBtNode,
	type EditableBtTree,
	getEditableNodeCaption,
} from "../../model/editableTree";
import type { ConnectorType, NodeType } from "../../types/workflow";

export function createCanvasElementsFromEditableTree(tree: EditableBtTree): {
	nodes: NodeType[];
	edges: ConnectorType[];
} {
	const nodes: NodeType[] = [];
	const edges: ConnectorType[] = [];

	const visit = (node: EditableBtNode, path: string, parentId?: string) => {
		nodes.push({
			id: node.id,
			path,
			caption: getEditableNodeCaption(node),
			state: State.READY,
			type: node.type,
			args: getNodeDisplayArgs(node),
			whileGuard: node.while ? toDisplayGuard(node.while) : undefined,
			untilGuard: node.until ? toDisplayGuard(node.until) : undefined,
			entryCallback: node.entry ? toDisplayCallback(node.entry) : undefined,
			stepCallback: node.step ? toDisplayCallback(node.step) : undefined,
			exitCallback: node.exit ? toDisplayCallback(node.exit) : undefined,
			isPlaceholder: node.isPlaceholder,
			variant: "default",
		});
		if (parentId) {
			edges.push({
				id: `${parentId}_${node.id}`,
				from: parentId,
				to: node.id,
				variant: "default",
			});
		}
		for (const [index, child] of node.children.entries()) {
			visit(child, `${path}.${index}`, node.id);
		}
	};

	visit(tree.root, "0");
	return { nodes, edges };
}

function getNodeDisplayArgs(node: EditableBtNode): NodeArgument[] {
	if (node.type === "action" || node.type === "condition") return node.args;
	if (node.type === "wait")
		return [node.duration as NodeArgument].filter((arg): arg is NodeArgument => arg !== undefined);
	if (node.type === "branch") return node.ref ? [node.ref] : [];
	return [];
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
