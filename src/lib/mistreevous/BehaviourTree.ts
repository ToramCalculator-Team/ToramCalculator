import State from "./State";
import Lookup from "./Lookup";
import { NodeDetails } from "./nodes/Node";
import Root from "./nodes/decorator/Root";
import { Agent, GlobalFunction } from "./Agent";
import { BehaviourTreeOptions } from "./BehaviourTreeOptions";
import { convertMDSLToJSON } from "./mdsl/MDSLDefinitionParser";
import { RootNodeDefinition } from "./BehaviourTreeDefinition";
import { validateDefinition, validateJSONDefinition } from "./BehaviourTreeDefinitionValidator";
import buildRootNode from "./BehaviourTreeBuilder";
import { isNullOrUndefined } from "./BehaviourTreeDefinitionUtilities";

/**
 * 行为树的表示。
 */
export class BehaviourTree {
    /**
     * 主根树节点。
     */
    private readonly _rootNode: Root;

    /**
     * 创建 BehaviourTree 类的新实例。
     * @param definition 行为树定义，可以是 MDSL 字符串、根节点定义对象或根节点定义对象数组。
     * @param agent 此行为树为其建模行为的 agent 实例。
     * @param options 行为树选项对象。
     */
    constructor(
        definition: string | RootNodeDefinition | RootNodeDefinition[],
        private agent: Agent,
        private options: BehaviourTreeOptions = {}
    ) {
        // 树定义必须已定义。
        if (isNullOrUndefined(definition)) {
            throw new Error("tree definition not defined");
        }

        // agent 必须已定义且不为 null。
        if (typeof agent !== "object" || agent === null) {
            throw new Error("the agent must be an object and not null");
        }

        // 在尝试构建树节点之前，我们应该验证定义。
        const { succeeded, errorMessage, json } = validateDefinition(definition);

        // 验证是否失败？
        if (!succeeded) {
            throw new Error(`invalid definition: ${errorMessage}`);
        }

        // 再次检查我们是否确实在定义验证过程中获得了 json 定义。
        if (!json) {
            throw new Error(
                "expected json definition to be returned as part of successful definition validation response"
            );
        }

        try {
            // 创建填充的行为树节点树并获取根节点。
            this._rootNode = buildRootNode(json, options);
        } catch (exception) {
            // 在尝试构建和填充行为树时出现问题。
            throw new Error(`error building tree: ${(exception as Error).message}`);
        }
    }

    /**
     * 获取树是否处于 RUNNING 状态。
     * @returns 如果树处于 RUNNING 状态则返回 true，否则返回 false。
     */
    public isRunning(): boolean {
        return this._rootNode.getState() === State.RUNNING;
    }

    /**
     * 获取当前树状态：SUCCEEDED、FAILED、READY 或 RUNNING。
     * @returns 当前树状态。
     */
    public getState(): State {
        return this._rootNode.getState();
    }

    /**
     * 执行树的一步。
     * 执行节点更新，从根节点向外遍历到所有子节点，跳过那些已经处于已解决状态（SUCCEEDED 或 FAILED）的节点。
     * 更新后，叶子节点将处于 SUCCEEDED、FAILED 或 RUNNING 状态。在树的一步中处于 RUNNING 状态的叶子节点将在每个
     * 后续步骤中重新访问，直到它们移动到 SUCCEEDED 或 FAILED 的已解决状态，之后执行将移动到树中下一个处于 READY 状态的节点。
     *
     * 当树已经处于已解决状态（SUCCEEDED 或 FAILED）时调用此方法，将在树遍历开始前重置树。
     */
    public step(): void {
        // 如果根节点已经执行完成，那么我们需要重置它。
        if (this._rootNode.getState() === State.SUCCEEDED || this._rootNode.getState() === State.FAILED) {
            this._rootNode.reset();
        }

        try {
            this._rootNode.update(this.agent);
        } catch (exception) {
            throw new Error(`error stepping tree: ${(exception as Error).message}`);
        }
    }

    /**
     * 从根节点向外重置树到每个嵌套节点，使每个节点处于 READY 状态。
     */
    public reset(): void {
        this._rootNode.reset();
    }

    /**
     * 获取树中每个节点的详细信息，从根节点开始。
     * @returns 树中每个节点的详细信息，从根节点开始。
     */
    public getTreeNodeDetails(): NodeDetails {
        return this._rootNode.getDetails();
    }

    /**
     * 注册具有给定名称的动作/条件/守卫/回调函数或子树。
     * @param name 要注册的函数或子树的名称。
     * @param value 要注册的函数或子树定义。
     */
    static register(name: string, value: GlobalFunction | string | RootNodeDefinition) {
        // 我们要注册一个动作/条件/守卫/回调函数吗？
        if (typeof value === "function") {
            Lookup.setFunc(name, value);
            return;
        }

        // 我们不是在注册动作/条件/守卫/回调函数，所以我们必须是在注册子树。
        if (typeof value === "string") {
            let rootNodeDefinitions: RootNodeDefinition[];

            // 我们假设传入的任何字符串都是 mdsl 定义。
            try {
                rootNodeDefinitions = convertMDSLToJSON(value);
            } catch (exception) {
                throw new Error(`error registering definition, invalid MDSL: ${(exception as Error).message}`);
            }

            // 此函数应该只使用包含单个未命名根节点的定义来调用。
            if (rootNodeDefinitions.length != 1 || typeof rootNodeDefinitions[0].id !== "undefined") {
                throw new Error("error registering definition: expected a single unnamed root node");
            }

            try {
                // 我们应该验证子树，因为我们不希望通过查找提供无效的子树。
                const { succeeded, errorMessage } = validateJSONDefinition(rootNodeDefinitions[0]);

                // 验证是否失败？
                if (!succeeded) {
                    throw new Error(errorMessage);
                }
            } catch (exception) {
                throw new Error(`error registering definition: ${(exception as Error).message}`);
            }

            // 一切看起来都没问题，注册子树。
            Lookup.setSubtree(name, rootNodeDefinitions[0]);
        } else if (typeof value === "object" && !Array.isArray(value)) {
            // 我们假设传入的任何对象都是根节点定义。

            try {
                // 我们应该验证子树，因为我们不希望通过查找提供无效的子树。
                const { succeeded, errorMessage } = validateJSONDefinition(value);

                // 验证是否失败？
                if (!succeeded) {
                    throw new Error(errorMessage);
                }
            } catch (exception) {
                throw new Error(`error registering definition: ${(exception as Error).message}`);
            }

            // 一切看起来都没问题，注册子树。
            Lookup.setSubtree(name, value);
        } else {
            throw new Error("unexpected value, expected string mdsl definition, root node json definition or function");
        }
    }

    /**
     * 注销具有给定名称的已注册动作/条件/守卫/回调函数或子树。
     * @param name 要注销的已注册动作/条件/守卫/回调函数或子树的名称。
     */
    static unregister(name: string): void {
        Lookup.remove(name);
    }

    /**
     * 注销所有已注册的动作/条件/守卫/回调函数和子树。
     */
    static unregisterAll(): void {
        Lookup.empty();
    }
}
