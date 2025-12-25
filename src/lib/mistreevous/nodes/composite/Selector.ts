import type { Agent } from "../../Agent";
import type { Attribute } from "../../attributes/Attribute";
import type { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { State } from "../../State";
import type { Node } from "../Node";
import { Composite } from "./Composite";

/**
 * 选择器节点。
 * 子节点按顺序执行，直到一个成功或全部失败。
 */
export class Selector extends Composite {
	/**
	 * @param attributes 节点属性。
	 * @param options 行为树选项。
	 * @param children 子节点。
	 */
	constructor(
		attributes: Attribute[],
		options: BehaviourTreeOptions,
		protected children: Node[],
	) {
		super("selector", attributes, options, children);
	}

	/**
	 * 当节点被更新时调用。
	 * @param agent 代理对象。
	 */
	protected onUpdate(agent: Agent): void {
		// 遍历此节点的所有子节点。
		for (const child of this.children) {
			// 如果子节点从未被更新或正在运行，则需要立即更新它。
			if (
				child.getState() === State.READY ||
				child.getState() === State.RUNNING
			) {
				// 更新此节点的子节点。
				child.update(agent);
			}

			// 如果当前子节点的状态为"成功"，则此节点也是"成功"节点。
			if (child.getState() === State.SUCCEEDED) {
				// 此节点是一个"成功"节点。
				this.setState(State.SUCCEEDED);

				// 无需检查选择器的其余节点。
				return;
			}

			// 如果当前子节点的状态为"失败"，则应该继续下一个子节点。
			if (child.getState() === State.FAILED) {
				// 检查当前子节点是否是选择器中的最后一个。
				// 如果是，则此序列节点也已失败。
				if (this.children.indexOf(child) === this.children.length - 1) {
					// 此节点是一个"失败"节点。
					this.setState(State.FAILED);

					// 无需检查选择器的其余部分，因为已经完成。
					return;
				} else {
					// 子节点失败，尝试下一个。
					continue;
				}
			}

			// 节点应该处于"运行中"状态。
			if (child.getState() === State.RUNNING) {
				// 此节点是一个"运行中"节点。
				this.setState(State.RUNNING);

				// 无需检查选择器的其余部分，因为当前子节点仍在运行。
				return;
			}

			// 子节点未处于预期状态。
			throw new Error("child node was not in an expected state.");
		}
	}

	/**
	 * 获取节点的名称。
	 */
	getName = () => "选择执行";
}
