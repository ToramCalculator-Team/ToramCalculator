import { Context, type ObjectType, type NodeContructor } from "~/lib/behavior3/context";
import type { Evaluator } from "~/lib/behavior3/evaluator";
import type { Node } from "~/lib/behavior3/node";
import type { TreeData } from "~/lib/behavior3/tree";
import { RunPipeline } from "./nodes/RunPipeline";
import { RunPipelineSync } from "./nodes/RunPipelineSync";
import { HasBuff } from "./nodes/HasBuff";
import { ScheduleFSMEvent } from "./nodes/ScheduleFSMEvent";
import { RunStage } from "./nodes/RunStage";
import { InsertDynamicStage } from "./nodes/InsertDynamicStage";
import type { ActionContext } from "../Action/ActionContext";

type CustomNodeCtor = NodeContructor<Node>;

export interface MemberBehaviorTreeRuntimeOptions {
  /** 额外需要注册的自定义节点 */
  customNodes?: CustomNodeCtor[];
}

/**
 * MemberBehaviorTreeRuntime
 * 抽象出成员行为树共享的基础上下文：
 * - 自动注册通用节点（RunPipeline、ScheduleFSMEvent）
 * - 与 GameEngine 的 JSProcessor 集成
 * - 统一的行为树加载与表达式缓存
 */
export class MemberBehaviorTreeRuntime<TOwner extends ActionContext> extends Context {
  /** JS 编译缓存，避免重复编译 */
  private readonly compiledFunctions = new Map<string, Function>();

  constructor(
    public owner: TOwner,
    options?: MemberBehaviorTreeRuntimeOptions,
  ) {
    super();

    this.registerNode(RunPipeline);
    this.registerNode(RunPipelineSync);
    this.registerNode(HasBuff);
    this.registerNode(ScheduleFSMEvent);
    this.registerNode(RunStage);
    this.registerNode(InsertDynamicStage);
    options?.customNodes?.forEach((node) => this.registerNode(node as any));
  }

  /** 保持行为树时间与引擎帧同步 */
  override get time(): number {
    return this.owner.currentFrame;
  }

  /** 统一的 JSProcessor 编译入口，确保所有成员都走 GameEngine 流程 */
  override compileCode(code: string): Evaluator {
    let compiledFn = this.compiledFunctions.get(code);

    if (!compiledFn) {
      const member = this.owner.engine.getMemberManager().getMember(this.owner.id);
      if (!member) {
        throw new Error(`无法获取成员实例: ${this.owner.id}`);
      }

      const compiledCode = this.owner.engine.compileScript(code, this.owner.id);
      compiledFn = this.owner.engine.createExpressionRunner(compiledCode);
      this.compiledFunctions.set(code, compiledFn);
    }

    return (values: ObjectType) => {
      const executionContext = this.buildExecutionContext(values);
      return compiledFn!(executionContext);
    };
  }

  /**
   * 可供子类扩展的执行上下文构建
   * 默认合并 owner 与 blackboard 变量
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected buildExecutionContext(values: ObjectType): Record<string, unknown> {
    return {
      ...this.owner,
      ...values,
    };
  }

  /**
   * 支持直接传入 TreeData 进行加载，也允许通过 name 访问已缓存树
   */
  override async loadTree(pathOrData: string | TreeData): Promise<Node> {
    if (typeof pathOrData === "string") {
      const existingTree = this.trees[pathOrData];
      if (existingTree) {
        return Promise.resolve(existingTree);
      }

      const loadedKeys = Object.keys(this.trees);
      throw new Error(
        `MemberBehaviorTreeRuntime.loadTree: "${pathOrData}" 尚未加载。\n` +
          `  请先调用 loadTree(TreeData) 载入定义，再按 name 获取。\n` +
          `  当前已加载: ${loadedKeys.length > 0 ? loadedKeys.join(", ") : "无"}`,
      );
    }

    const treeData = pathOrData;
    const rootNode = this._createTree(treeData);
    const treeKey = treeData.name || "member_behavior_tree";
    this.trees[treeKey] = rootNode;
    return Promise.resolve(rootNode);
  }
}

