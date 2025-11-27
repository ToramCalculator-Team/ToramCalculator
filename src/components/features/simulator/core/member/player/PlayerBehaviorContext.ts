import { Context } from "~/lib/behavior3/context";
import type { Node } from "~/lib/behavior3/node";
import type { TreeData } from "~/lib/behavior3/tree";
import type { PlayerStateContext } from "./PlayerStateMachine";
import { RunPipeline } from "../behaviorTree/nodes/RunPipeline";
import { ScheduleFSMEvent } from "../behaviorTree/nodes/ScheduleFSMEvent";
import type { Evaluator } from "~/lib/behavior3/evaluator";
import type { ObjectType } from "~/lib/behavior3/context";

/**
 * PlayerBehaviorContext
 * 玩家技能执行行为树的上下文
 * 
 * 设计要点：
 * - owner 是 PlayerStateContext，包含所有运行时数据
 * - time 直接使用 owner.currentFrame，确保与引擎帧完全同步
 * - 注册技能执行相关的自定义节点
 * - 表达式求值可以直接访问 owner 的属性，无需手动同步到 blackboard
 */
export class PlayerBehaviorContext extends Context {
  // 编译后的函数缓存，避免重复编译
  private readonly _compiledFunctions: Map<string, Function> = new Map();

  constructor(public owner: PlayerStateContext) {
    super();
    
    // 注册技能执行相关的自定义节点
    this.registerNode(RunPipeline);
    this.registerNode(ScheduleFSMEvent);
    
    // 注意：其他基础节点（如 Sequence, WaitForEvent 等）已在父类构造函数中注册
  }

  /**
   * 重写 time getter，直接使用 owner.currentFrame
   * 确保行为树时间与引擎帧完全同步
   */
  override get time(): number {
    return this.owner.currentFrame;
  }

  /**
   * 重写 compileCode 方法，使用 JSProcessor 编译表达式
   * 
   * 优势：
   * - 支持完整 JS 语法（Math.min、方法调用等）
   * - 编译时路径验证
   * - 统一的编译逻辑（与管线使用同一套）
   * - 编译结果缓存
   */
  override compileCode(code: string): Evaluator {
    // 检查缓存
    let compiledFn = this._compiledFunctions.get(code);
    
    if (!compiledFn) {
      // 获取 member 实例以访问 dataSchema
      const member = this.owner.engine.getMemberManager().getMember(this.owner.id);
      if (!member) {
        throw new Error(`无法获取成员实例: ${this.owner.id}`);
      }

      // 使用 JSProcessor 编译表达式（通过 GameEngine 统一入口）
      // JSProcessor 会将 self.xxx 转换为 self.statContainer.getValue('xxx')
      const compiledCode = this.owner.engine.compileScript(code, this.owner.id);

      // 通过 GameEngine 提供的统一 helper 创建执行函数
      // 内部使用 with(ctx) 暴露字段，表达式可以直接访问 currentSkillStartupFrames 等变量
      compiledFn = this.owner.engine.createExpressionRunner(compiledCode);
      this._compiledFunctions.set(code, compiledFn);
    }
    
    // 返回求值函数
    return (values: ObjectType) => {
      // 构建执行上下文：合并 blackboard 变量和 owner 属性
      // JSProcessor 编译后的代码会注入 self 对象，可以直接访问 member 的所有属性和方法
      const execCtx = {
        ...this.owner,  // currentFrame, currentSkillName, engine 等
        ...values       // blackboard 变量（如 chargeCounter, damage 等）
      };
      return compiledFn(execCtx);
    };
  }

  /**
   * 加载行为树
   * 支持从 JSON 对象或路径加载
   * 
   * 路径加载：如果路径对应的树已加载，直接返回；否则抛出错误（因为技能逻辑应该预先加载）
   * TreeData 加载：创建新的树节点并缓存
   */
  override async loadTree(pathOrData: string | TreeData): Promise<Node> {
    if (typeof pathOrData === "string") {
      // 如果是路径，尝试从已加载的树中获取
      const existingTree = this.trees[pathOrData];
      if (existingTree) {
        return Promise.resolve(existingTree);
      }
      // 如果树不存在，说明应该在创建 Tree 之前先加载 TreeData
      const availableTrees = Object.keys(this.trees);
      throw new Error(
        `PlayerBehaviorContext.loadTree: 路径 "${pathOrData}" 对应的树尚未加载。\n` +
        `  请先调用 loadTree(TreeData) 加载树数据，然后再创建 Tree 实例。\n` +
        `  已加载的树: ${availableTrees.length > 0 ? availableTrees.join(", ") : "无"}\n` +
        `  可能的原因：\n` +
        `    1. 技能效果的 logic 字段为空或格式错误\n` +
        `    2. logic 字段中的 name 与传入的路径不匹配\n` +
        `    3. 在创建 Tree 之前没有调用 loadTree(TreeData)`,
      );
    } else {
      // 直接传入 TreeData，创建树节点
      const treeData = pathOrData;
      const rootNode = this._createTree(treeData);
      const treeKey = treeData.name || "skill_logic";
      this.trees[treeKey] = rootNode;
      return Promise.resolve(rootNode);
    }
  }
}

