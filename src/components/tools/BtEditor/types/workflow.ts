import type { NodeDetails } from "~/lib/mistreevous/nodes/Node";
import type { State } from "~/lib/mistreevous/State";

export type Position = { x: number; y: number };
export type ClientPoint = { x: number; y: number };
export type ClientRect = { left: number; top: number; width: number; height: number };
export type TreeNodeDragStart = {
	nodeId: string;
	pointerId: number;
	startPointer: ClientPoint;
	currentPointer: ClientPoint;
	sourceRect: ClientRect;
};

/**
 * Connector variant types
 */
export type ConnectorVariant = "default" | "active" | "succeeded" | "failed";

/**
 * Common props for all connector components
 */
export type ConnectorProps = {
	source: Position;
	target: Position;
	containerWidth: number;
	containerHeight: number;
};

/**
 * The Node type.
 */
export type NodeType = {
	id: string;
	path: string;
	caption: string;
	state: State;
	type: string;
	args: NodeDetails["args"];
	whileGuard?: NodeDetails["while"];
	untilGuard?: NodeDetails["until"];
	entryCallback?: NodeDetails["entry"];
	stepCallback?: NodeDetails["step"];
	exitCallback?: NodeDetails["exit"];
	isPlaceholder?: boolean;
	variant: "default" | "selected";
};

/**
 * The Connector type.
 */
export type ConnectorType = {
	id: string;
	from: string;
	to: string;
	variant: ConnectorVariant;
};

export type WorkflowDragOverlay = {
	nodes: NodeType[];
	edges: ConnectorType[];
	sourceRect: ClientRect;
	startPointer: ClientPoint;
	currentPointer: ClientPoint;
};

export type ChildNode = {
	connector: ConnectorType;
	child: NodeWithChildren;
};

export type NodeWithChildren = {
	node: NodeType;
	children: ChildNode[];
};
