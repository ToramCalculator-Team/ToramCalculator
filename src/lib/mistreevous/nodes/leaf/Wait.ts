import Leaf from "./Leaf";
import State from "../../State";
import Attribute from "../../attributes/Attribute";
import { Agent } from "../../Agent";
import { BehaviourTreeOptions } from "../../BehaviourTreeOptions";
import { AgentPropertyReference, isAgentPropertyReference, resolveAgentNonNegativeInteger } from "../../AgentPropertyReference";

type WaitDurationArg = number | AgentPropertyReference;

/**
 * 等待节点。
 * 此节点的状态将在经过一段时间后变为成功。
 */
export default class Wait extends Leaf {
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
        private durationMax: WaitDurationArg | null
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
        return resolveAgentNonNegativeInteger(
            agent,
            value,
            typeof value === "number" ? "wait 节点持续时间（ms）" : `wait 节点引用的 agent 属性 '${value.$}'（ms）`
        );
    };

    /**
     * 当节点被更新时调用。
     * @param agent 代理对象。
     */
    protected onUpdate(agent: Agent): void {
        // 如果此节点处于 READY 状态，则需要设置初始更新时间。
        if (this.is(State.READY)) {
            // 设置初始更新时间。
            this.initialUpdateTime = new Date().getTime();

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
                this.totalDuration = Math.floor(
                    random() * (resolvedMax - resolvedMin + 1) + resolvedMin
                );
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

        // 如果我们在选项中定义了 'getDeltaTime' 函数，则使用它来计算我们已经等待了多长时间。
        if (typeof this.options.getDeltaTime === "function") {
            // 获取增量时间。
            const deltaTime = this.options.getDeltaTime();

            // 我们的增量时间必须是有效数字，不能是 NaN。
            if (typeof deltaTime !== "number" || isNaN(deltaTime)) {
                throw new Error("The delta time must be a valid number and not NaN.");
            }

            // 根据增量时间更新此节点已等待的时间量。
            this.waitedDuration += deltaTime * 1000;
        } else {
            // 我们没有使用增量时间，因此只需计算自首次更新以来已经过去了多少时间。
            this.waitedDuration = new Date().getTime() - this.initialUpdateTime;
        }

        // 我们等待的时间是否足够长？
        if (this.waitedDuration >= this.totalDuration) {
            // 我们已经完成等待！
            this.setState(State.SUCCEEDED);
        }
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
