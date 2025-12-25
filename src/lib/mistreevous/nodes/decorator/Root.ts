import type { Agent } from "../../Agent";
import type { Attribute } from "../../attributes/Attribute";
import type { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { State } from "../../State";
import type { Node } from "../Node";
import { Decorator } from "./Decorator";

/**
 * A Root node.
 * The root node will have a single child.
 */
export class Root extends Decorator {
	/**
	 * @param attributes The node attributes.
	 * @param options The behaviour tree options.
	 * @param child The child node.
	 */
	constructor(
		attributes: Attribute[],
		options: BehaviourTreeOptions,
		child: Node,
	) {
		super("root", attributes, options, child);
	}

	/**
	 * Called when the node is being updated.
	 * @param agent The agent.
	 */
	protected onUpdate(agent: Agent): void {
		// If the child has never been updated or is running then we will need to update it now.
		if (
			this.child.getState() === State.READY ||
			this.child.getState() === State.RUNNING
		) {
			// Update the child of this node.
			this.child.update(agent);
		}

		// The state of the root node is the state of its child.
		this.setState(this.child.getState());
	}

	/**
	 * Gets the name of the node.
	 */
	getName = () => "根节点";
}
