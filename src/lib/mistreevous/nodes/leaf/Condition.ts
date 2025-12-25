import type { ActionResult, Agent } from "../../Agent";
import type { Attribute } from "../../attributes/Attribute";
import type { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { Lookup } from "../../Lookup";
import { State } from "../../State";
import type { NodeDetails } from "../Node";
import { Leaf } from "./Leaf";

/**
 * 条件叶子节点。
 * 这将根据代理谓词立即成功或失败，而不会进入"运行中"状态。
 */
export class Condition extends Leaf {
	/**
	 * @param attributes 节点属性。
	 * @param options 行为树选项。
	 * @param conditionName 条件函数的名称。
	 * @param conditionArguments 条件参数数组。
	 */
	constructor(
		attributes: Attribute[],
		options: BehaviourTreeOptions,
		private conditionName: string,
		public conditionArguments: any[],
	) {
		super("condition", attributes, options);
	}

	/**
	 * 当节点被更新时调用。
	 * @param agent 代理对象。
	 */
	protected onUpdate(agent: Agent): void {
		// 尝试获取条件函数的调用器。
		const conditionFuncInvoker = Lookup.getFuncInvoker(
			agent,
			this.conditionName,
		);

		// 条件函数应该已定义。
		if (conditionFuncInvoker === null) {
			throw new Error(
				`cannot update condition node as the condition '${this.conditionName}' function is not defined on the agent and has not been registered`,
			);
		}

		let conditionFunctionResult: ActionResult | boolean;

		try {
			// 调用条件函数以确定此节点的状态，其结果应该是布尔值。
			conditionFunctionResult = conditionFuncInvoker(this.conditionArguments);
		} catch (error) {
			// 抛出了未捕获的错误。
			if (error instanceof Error) {
				throw new Error(
					`condition function '${this.conditionName}' threw: ${error.stack}`,
				);
			} else {
				throw new Error(
					`condition function '${this.conditionName}' threw: ${error}`,
				);
			}
		}

		// 调用条件函数的结果必须是布尔值。
		if (typeof conditionFunctionResult !== "boolean") {
			throw new Error(
				`expected condition function '${this.conditionName}' to return a boolean but returned '${conditionFunctionResult}'`,
			);
		}

		// 根据调用条件函数的结果设置此节点的状态。
		this.setState(conditionFunctionResult ? State.SUCCEEDED : State.FAILED);
	}

	/**
	 * 获取节点的名称。
	 */
	getName = () => `条件 ${this.conditionName}`;

	/**
	 * 获取此节点实例的详细信息。
	 * @returns 此节点实例的详细信息。
	 */
	public getDetails(): NodeDetails {
		return {
			...super.getDetails(),
			args: this.conditionArguments,
		};
	}

	/**
	 * 当此节点的状态改变时调用。
	 * @param previousState 之前的节点状态。
	 */
	protected onStateChanged(previousState: State): void {
		this.options.onNodeStateChange?.({
			id: this.uid,
			type: this.getType(),
			args: this.conditionArguments,
			while: this.attributes.while?.getDetails(),
			until: this.attributes.until?.getDetails(),
			entry: this.attributes.entry?.getDetails(),
			step: this.attributes.step?.getDetails(),
			exit: this.attributes.exit?.getDetails(),
			previousState,
			state: this.getState(),
		});
	}
}

export { Condition as default };
