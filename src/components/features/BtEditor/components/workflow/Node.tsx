import type { Component } from "solid-js";
import type { NodeType } from "../../types/workflow";

export type NodeProps = {
	wrapped: Component<NodeType>;
	model: NodeType;
};

export const Node: Component<NodeProps> = (props) => {
	const Wrapped = props.wrapped;
	return (
		<div class="select-none">
			<Wrapped {...props.model} />
		</div>
	);
};
