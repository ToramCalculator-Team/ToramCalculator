import type { Agent } from "../../Agent";
import type { Attribute } from "../../attributes/Attribute";
import type { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { State } from "../../State";
import type { Node } from "../Node";
import { Composite } from "./Composite";

/**
 * 竞争执行节点。
 * 子节点并发执行，直到一个成功或全部失败。
 */
export class Race extends Composite {
	/**
	 * @param attributes 节点属性。
	 * @param options 行为树选项。
	 * @param children 子节点。
	 */
	constructor(
		attributes: Attribute[],
		options: BehaviourTreeOptions,
		children: Node[],
	) {
		super("race", attributes, options, children);
	}

	/**
	 * 当节点被更新时调用。
	 * @param agent 代理对象。
	 */
	protected onUpdate(agent: Agent): void {
		// 遍历此节点的所有子节点，更新任何未处于稳定状态的子节点。
		for (const child of this.children) {
			// 如果子节点从未被更新或正在运行，则需要立即更新它。
			if (
				child.getState() === State.READY ||
				child.getState() === State.RUNNING
			) {
				// 更新此节点的子节点。
				child.update(agent);
			}
		}

		// 如果任何子节点成功，则此节点也成功。
		if (this.children.find((child) => child.is(State.SUCCEEDED))) {
			// 此节点是一个"成功"节点。
			this.setState(State.SUCCEEDED);

			// 中止所有正在运行的子节点。
			for (const child of this.children) {
				if (child.getState() === State.RUNNING) {
					child.abort(agent);
				}
			}

			return;
		}

		// 如果所有子节点都进入失败状态，则竞争执行节点将进入失败状态，因为无法成功。
		if (this.children.every((child) => child.is(State.FAILED))) {
			// 此节点是一个"失败"节点。
			this.setState(State.FAILED);

			return;
		}

		// 如果没有进入成功或失败状态，则此节点仍在运行。
		this.setState(State.RUNNING);
	}

	/**
	 * 获取节点的名称。
	 */
	getName = () => "竞争执行";
}
