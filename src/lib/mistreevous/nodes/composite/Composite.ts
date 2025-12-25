import type { Agent } from "../../Agent";
import type { Attribute } from "../../attributes/Attribute";
import type { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { State } from "../../State";
import { Node, type NodeDetails } from "../Node";

/**
 * 包装子节点的复合节点。
 */
export abstract class Composite extends Node {
	/**
	 * @param type 节点类型。
	 * @param attributes 节点属性。
	 * @param options 行为树选项。
	 * @param children 子节点。
	 */
	constructor(
		type: string,
		attributes: Attribute[],
		options: BehaviourTreeOptions,
		protected children: Node[],
	) {
		super(type, attributes, options);
	}

	/**
	 * 获取此节点的子节点。
	 */
	getChildren = () => this.children;

	/**
	 * 重置节点的状态。
	 */
	reset = () => {
		// 重置此节点的状态。
		this.setState(State.READY);

		// 重置所有子节点的状态。
		this.children.forEach((child) => {
			child.reset();
		});
	};

	/**
	 * 中止此节点的运行。
	 * @param agent 代理对象。
	 */
	abort = (agent: Agent) => {
		// 如果此节点不在运行状态，则无需执行任何操作。
		if (!this.is(State.RUNNING)) {
			return;
		}

		// 中止所有子节点。
		this.children.forEach((child) => {
			child.abort(agent);
		});

		// 重置此节点的状态。
		this.reset();

		this.attributes.exit?.callAgentFunction(agent, false, true);
	};

	/**
	 * 获取此节点实例的详细信息。
	 * @returns 此节点实例的详细信息。
	 */
	public getDetails(): NodeDetails {
		return {
			...super.getDetails(),
			children: this.children.map((child) => child.getDetails()),
		};
	}
}
