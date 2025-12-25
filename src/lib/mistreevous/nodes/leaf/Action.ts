import type { ActionResult, Agent } from "../../Agent";
import type { Attribute } from "../../attributes/Attribute";
import type { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { Lookup } from "../../Lookup";
import { type CompleteState, State } from "../../State";
import type { NodeDetails } from "../Node";
import { Leaf } from "./Leaf";

/**
 * 表示已解决/已拒绝的更新 Promise 的类型。
 */
type UpdatePromiseResult = {
	/**
	 * Promise 是否已解决而非被拒绝。
	 */
	isResolved: boolean;

	/**
	 * Promise 的解决值或拒绝原因。
	 */
	value: any;
};

/**
 * 动作叶子节点。
 * 这表示行为的即时或持续状态。
 */
export class Action extends Leaf {
	/**
	 * @param attributes 节点属性。
	 * @param options 行为树选项。
	 * @param actionName 动作名称。
	 * @param actionArguments 动作参数数组。
	 */
	constructor(
		attributes: Attribute[],
		options: BehaviourTreeOptions,
		private actionName: string,
		public actionArguments: any[],
	) {
		super("action", attributes, options);
	}

	/**
	 * 是否存在待处理的更新 Promise。
	 */
	private isUsingUpdatePromise = false;

	/**
	 * 更新 Promise 的完成状态结果。
	 */
	private updatePromiseResult: UpdatePromiseResult | null = null;

	/**
	 * 当节点被更新时调用。
	 * @param agent 代理对象。
	 */
	protected onUpdate(agent: Agent): void {
		// 如果此动作的结果依赖于更新 Promise，则在它解决之前无事可做。
		if (this.isUsingUpdatePromise) {
			// 我们是否仍在等待更新 Promise 解决？
			if (!this.updatePromiseResult) {
				return;
			}

			const { isResolved, value } = this.updatePromiseResult;

			// 我们的更新 Promise 已解决，它是被解决还是被拒绝？
			if (isResolved) {
				// 我们的 Promise 已解决，检查以确保结果是有效的完成状态。
				if (value !== State.SUCCEEDED && value !== State.FAILED) {
					throw new Error(
						"action node promise resolved with an invalid value, expected a State.SUCCEEDED or State.FAILED value to be returned",
					);
				}

				// 设置此节点的状态以匹配 Promise 返回的状态。
				this.setState(value);

				return;
			} else {
				// Promise 被拒绝，这不太好。
				throw new Error(
					`action function '${this.actionName}' promise rejected with '${value}'`,
				);
			}
		}

		// 尝试获取动作函数的调用器。
		const actionFuncInvoker = Lookup.getFuncInvoker(agent, this.actionName);

		// 动作函数应该已定义。
		if (actionFuncInvoker === null) {
			throw new Error(
				`cannot update action node as the action '${this.actionName}' function is not defined on the agent and has not been registered`,
			);
		}

		let actionFunctionResult: ActionResult | boolean;

		try {
			// 调用动作函数，其结果可能是：
			// - 此动作节点的完成状态。
			// - 返回完成节点状态的 Promise。
			// - 如果节点应保持运行状态，则为 undefined。
			actionFunctionResult = actionFuncInvoker(this.actionArguments) as
				| CompleteState
				| Promise<CompleteState>;
		} catch (error) {
			// 抛出了未捕获的错误。
			if (error instanceof Error) {
				throw new Error(
					`action function '${this.actionName}' threw: ${error.stack}`,
				);
			} else {
				throw new Error(`action function '${this.actionName}' threw: ${error}`);
			}
		}

		if (actionFunctionResult instanceof Promise) {
			actionFunctionResult.then(
				(result) => {
					// 如果未设置 'isUpdatePromisePending'，则 Promise 在解决时被清除，可能是通过中止或重置。
					if (!this.isUsingUpdatePromise) {
						return;
					}

					// 设置已解决的更新 Promise 结果，以便在下次更新此节点时处理。
					this.updatePromiseResult = {
						isResolved: true,
						value: result,
					};
				},
				(reason) => {
					// 如果未设置 'isUpdatePromisePending'，则 Promise 在解决时被清除，可能是通过中止或重置。
					if (!this.isUsingUpdatePromise) {
						return;
					}

					// 设置被拒绝的更新 Promise 结果，以便在下次更新此节点时处理。
					this.updatePromiseResult = {
						isResolved: false,
						value: reason,
					};
				},
			);

			// 此节点将处于"运行中"状态，直到更新 Promise 解决。
			this.setState(State.RUNNING);

			// 我们现在等待用户返回的 Promise 解决，然后才能知道此节点的状态。
			this.isUsingUpdatePromise = true;
		} else {
			// 验证返回值。
			this.validateUpdateResult(actionFunctionResult);

			// 设置此节点的状态，这可能为 undefined，仅表示节点仍处于"运行中"状态。
			this.setState(actionFunctionResult || State.RUNNING);
		}
	}

	/**
	 * 获取节点的名称。
	 */
	getName = () => `动作 ${this.actionName}`;

	/**
	 * 重置节点的状态。
	 */
	reset = () => {
		// 重置此节点的状态。
		this.setState(State.READY);

		// 不再有我们关心的更新 Promise。
		this.isUsingUpdatePromise = false;
		this.updatePromiseResult = null;
	};

	/**
	 * 获取此节点实例的详细信息。
	 * @returns 此节点实例的详细信息。
	 */
	public getDetails(): NodeDetails {
		return {
			...super.getDetails(),
			args: this.actionArguments,
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
			args: this.actionArguments,
			while: this.attributes.while?.getDetails(),
			until: this.attributes.until?.getDetails(),
			entry: this.attributes.entry?.getDetails(),
			step: this.attributes.step?.getDetails(),
			exit: this.attributes.exit?.getDetails(),
			previousState,
			state: this.getState(),
		});
	}

	/**
	 * 验证更新函数调用的结果。
	 * @param result 更新函数调用的结果。
	 */
	private validateUpdateResult = (result: CompleteState | State.RUNNING) => {
		switch (result) {
			case State.SUCCEEDED:
			case State.FAILED:
			case State.RUNNING:
			case undefined:
				return;
			default:
				throw new Error(
					`expected action function '${this.actionName}' to return an optional State.SUCCEEDED or State.FAILED value but returned '${result}'`,
				);
		}
	};
}
