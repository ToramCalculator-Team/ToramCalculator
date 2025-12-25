import type { Agent } from "../../Agent";
import type { Attribute } from "../../attributes/Attribute";
import type { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { State } from "../../State";
import type { Node } from "../Node";
import { Composite } from "./Composite";

/**
 * A PARALLEL node.
 * The child nodes are executed concurrently until one fails or all succeed.
 */
export class Parallel extends Composite {
	/**
	 * @param attributes The node attributes.
	 * @param options The behaviour tree options.
	 * @param children The child nodes.
	 */
	constructor(
		attributes: Attribute[],
		options: BehaviourTreeOptions,
		children: Node[],
	) {
		super("parallel", attributes, options, children);
	}

	/**
	 * Called when the node is being updated.
	 * @param agent The agent.
	 */
	protected onUpdate(agent: Agent): void {
		// Iterate over all of the children of this node, updating any that aren't in a settled state.
		for (const child of this.children) {
			// If the child has never been updated or is running then we will need to update it now.
			if (
				child.getState() === State.READY ||
				child.getState() === State.RUNNING
			) {
				// Update the child of this node.
				child.update(agent);
			}
		}

		// If any of our child nodes have failed then this node has also failed.
		if (this.children.find((child) => child.is(State.FAILED))) {
			// This node is a 'FAILED' node.
			this.setState(State.FAILED);

			// Abort every running child.
			for (const child of this.children) {
				if (child.getState() === State.RUNNING) {
					child.abort(agent);
				}
			}

			return;
		}

		// A parallel node will move into the succeeded state if all child nodes move into the succeeded state.
		if (this.children.every((child) => child.is(State.SUCCEEDED))) {
			// This node is a 'SUCCEEDED' node.
			this.setState(State.SUCCEEDED);

			return;
		}

		// If we didn't move to a succeeded or failed state then this node is still running.
		this.setState(State.RUNNING);
	}

	/**
	 * Gets the name of the node.
	 */
	getName = () => "同时执行";
}
