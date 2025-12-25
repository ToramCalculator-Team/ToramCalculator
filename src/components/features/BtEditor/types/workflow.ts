import type { NodeDetails } from "~/lib/mistreevous/nodes/Node";
import type { State } from "~/lib/mistreevous/State";

export type Position = { x: number; y: number };

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
	caption: string;
	state: State;
	type: string;
	args: NodeDetails["args"];
	whileGuard?: NodeDetails["while"];
	untilGuard?: NodeDetails["until"];
	entryCallback?: NodeDetails["entry"];
	stepCallback?: NodeDetails["step"];
	exitCallback?: NodeDetails["exit"];
	variant: string;
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

export type ChildNode = {
	connector: ConnectorType;
	child: NodeWithChildren;
};

export type NodeWithChildren = {
	node: NodeType;
	children: ChildNode[];
};
