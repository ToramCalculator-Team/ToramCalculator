import type { Agent } from "../../Agent";
import type { Attribute } from "../../attributes/Attribute";
import type { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { State } from "../../State";
import type { Node } from "../Node";
import { Decorator } from "./Decorator";

/**
 * A Flip node.
 * This node wraps a single child and will flip the state of the child state.
 */
export class Flip extends Decorator {
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
		super("flip", attributes, options, child);
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
			this.child.update(agent);
		}

		// The state of this node will depend in the state of its child.
		switch (this.child.getState()) {
			case State.RUNNING:
				this.setState(State.RUNNING);
				break;

			case State.SUCCEEDED:
				this.setState(State.FAILED);
				break;

			case State.FAILED:
				this.setState(State.SUCCEEDED);
				break;

			default:
				this.setState(State.READY);
		}
	}

	/**
	 * Gets the name of the node.
	 */
	getName = () => "反转节点";
}
