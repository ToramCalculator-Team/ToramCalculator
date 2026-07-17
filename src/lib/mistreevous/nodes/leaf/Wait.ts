import type { Agent } from "../../Agent";
import {
	type AgentPropertyReference,
	isAgentPropertyReference,
	resolveAgentNonNegativeNumber,
} from "../../AgentPropertyReference";
import type { Attribute } from "../../attributes/Attribute";
import type { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { State } from "../../State";
import { Leaf } from "./Leaf";

type WaitDurationArg = number | AgentPropertyReference;

/**
 * 等待节点。
 * 此节点的状态将在经过一段时间后变为成功。
 */
export class Wait extends Leaf {
	/**
	 * @param attributes 节点属性。
	 * @param options 行为树选项。
	 * @param duration 此节点等待成功的持续时间（毫秒）。
	 * @param durationMin 此节点等待成功的最小可能持续时间（毫秒）。
	 * @param durationMax 此节点等待成功的最大可能持续时间（毫秒）。
	 */
	constructor(
		attributes: Attribute[],
		options: BehaviourTreeOptions,
		private duration: WaitDurationArg | null,
		private durationMin: WaitDurationArg | null,
		private durationMax: WaitDurationArg | null,
	) {
		super("wait", attributes, options);
	}

	/**
	 * 此节点首次更新的时间（毫秒）。
	 */
	private initialUpdateTime: number = 0;

	/**
	 * 此节点将等待的总持续时间（毫秒）。
	 */
	private totalDuration: number | null = null;

	/**
	 * 此节点已等待的持续时间（毫秒）。
	 */
	private waitedDuration: number = 0;

	private resolveDurationValue = (agent: Agent, value: WaitDurationArg): number => {
		if (typeof value !== "number" && !isAgentPropertyReference(value)) {
			throw new Error(`wait 节点 duration 参数无效：${JSON.stringify(value)}`);
		}
		return resolveAgentNonNegativeNumber(
			agent,
			value,
			typeof value === "number" ? "wait 节点持续时间（ms）" : `wait 节点引用的 agent 属性 '${value.$}'（ms）`,
			this.options.resolveProperty,
		);
	};

	/**
	 * 当节点被更新时调用。
	 * @param agent 代理对象。
	 */
	protected onUpdate(agent: Agent): void {
		const isStarting = this.is(State.READY);
		// 如果此节点处于 READY 状态，则需要设置初始更新时间。
		if (isStarting) {
			// 设置初始更新时间。
			this.initialUpdateTime = this.readCurrentTimeMs();

			// 设置初始等待持续时间。
			this.waitedDuration = 0;

			// 我们是在处理明确的持续时间，还是在最小和最大持续时间之间随机选择持续时间。
			if (this.duration !== null) {
				this.totalDuration = this.resolveDurationValue(agent, this.duration);
			} else if (this.durationMin !== null && this.durationMax !== null) {
				const resolvedMin = this.resolveDurationValue(agent, this.durationMin);
				const resolvedMax = this.resolveDurationValue(agent, this.durationMax);

				if (resolvedMin > resolvedMax) {
					throw new Error(`wait 节点的最小持续时间不能大于最大持续时间：${resolvedMin} > ${resolvedMax}`);
				}

				// 我们将在最小和最大持续时间之间随机选择持续时间，如果定义了可选的 'random' 行为树
				// 函数选项，则使用它，否则回退到使用 Math.random。
				const random = typeof this.options.random === "function" ? this.options.random : Math.random;

				// 在最小和最大持续时间之间随机选择持续时间。
				this.totalDuration =
					Number.isInteger(resolvedMin) && Number.isInteger(resolvedMax)
						? Math.floor(random() * (resolvedMax - resolvedMin + 1) + resolvedMin)
						: random() * (resolvedMax - resolvedMin) + resolvedMin;
			} else {
				this.totalDuration = null;
			}

			// 节点现在正在运行，直到我们完成等待。
			this.setState(State.RUNNING);
		}

		// 如果我们没有总持续时间，则此等待节点将无限期等待，直到被中止。
		if (this.totalDuration === null) {
			return;
		}
		if (this.totalDuration === 0) {
			this.setState(State.SUCCEEDED);
			return;
		}

		// 引擎内优先读取权威模拟时刻，避免在首次更新时提前计入尚未完成的当前 Tick。
		if (typeof this.options.getCurrentTimeMs === "function") {
			const currentTimeMs = this.readCurrentTimeMs();
			if (currentTimeMs < this.initialUpdateTime) {
				throw new Error("wait 节点检测到模拟时间倒退");
			}
			this.waitedDuration = currentTimeMs - this.initialUpdateTime;
		} else if (typeof this.options.getDeltaTimeMs === "function") {
			if (isStarting) return;
			// 获取增量时间。
			const deltaTimeMs = this.options.getDeltaTimeMs();

			// 增量时间必须是非负有限数值。
			if (!Number.isFinite(deltaTimeMs) || deltaTimeMs < 0) {
				throw new Error("wait 节点需要非负有限的 deltaTimeMs");
			}

			// 根据增量时间更新此节点已等待的时间量。
			this.waitedDuration += deltaTimeMs;
		} else {
			// 我们没有使用增量时间，因此只需计算自首次更新以来已经过去了多少时间。
			this.waitedDuration = Date.now() - this.initialUpdateTime;
		}

		// 我们等待的时间是否足够长？
		if (this.waitedDuration >= this.totalDuration) {
			// 我们已经完成等待！
			this.setState(State.SUCCEEDED);
		}
	}

	private readCurrentTimeMs(): number {
		const currentTimeMs = this.options.getCurrentTimeMs?.() ?? Date.now();
		if (!Number.isFinite(currentTimeMs) || currentTimeMs < 0) {
			throw new Error("wait 节点需要非负有限的模拟时间");
		}
		return currentTimeMs;
	}

	/**
	 * 获取节点的名称。
	 */
	getName = () => {
		const formatArg = (arg: WaitDurationArg) => (typeof arg === "number" ? `${arg}` : `$${arg.$}`);
		if (this.duration !== null) {
			return `等待 ${formatArg(this.duration)}ms`;
		} else if (this.durationMin !== null && this.durationMax !== null) {
			return `等待 ${formatArg(this.durationMin)}ms-${formatArg(this.durationMax)}ms`;
		} else {
			return "等待";
		}
	};
}
