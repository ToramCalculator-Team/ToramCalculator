import Composite from "./Composite";
import State from "../../State";
import Node from "../Node";
import { Agent } from "../../Agent";
import Attribute from "../../attributes/Attribute";
import { BehaviourTreeOptions } from "../../BehaviourTreeOptions";

/**
 * 全部执行节点。
 * 子节点并发执行，直到所有子节点都进入完成状态。
 */
export default class All extends Composite {
    /**
     * @param attributes 节点属性。
     * @param options 行为树选项。
     * @param children 子节点。
     */
    constructor(attributes: Attribute[], options: BehaviourTreeOptions, children: Node[]) {
        super("all", attributes, options, children);
    }

    /**
     * 当节点被更新时调用。
     * @param agent 代理对象。
     */
    protected onUpdate(agent: Agent): void {
        // 遍历此节点的所有子节点，更新任何未处于稳定状态的子节点。
        for (const child of this.children) {
            // 如果子节点从未被更新或正在运行，则需要立即更新它。
            if (child.getState() === State.READY || child.getState() === State.RUNNING) {
                // 更新此节点的子节点。
                child.update(agent);
            }
        }

        // 如果所有子节点都进入完成状态，则全部执行节点将进入完成状态。
        if (this.children.every((child) => child.is(State.SUCCEEDED) || child.is(State.FAILED))) {
            // 如果任何子节点成功，则此节点也成功，否则失败。
            this.setState(this.children.find((child) => child.is(State.SUCCEEDED)) ? State.SUCCEEDED : State.FAILED);

            return;
        }

        // 如果没有进入成功或失败状态，则此节点仍在运行。
        this.setState(State.RUNNING);
    }

    /**
     * 获取节点的名称。
     */
    getName = () => "全部执行";
}
