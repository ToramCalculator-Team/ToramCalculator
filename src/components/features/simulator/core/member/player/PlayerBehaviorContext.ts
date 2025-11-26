import { Context } from "~/lib/behavior3/context";
import type { Node } from "~/lib/behavior3/node";
import type { TreeData } from "~/lib/behavior3/tree";
import type { PlayerStateContext } from "./PlayerStateMachine";
import { RunPipeline } from "../behaviorTree/nodes/RunPipeline";
import { ScheduleFSMEvent } from "../behaviorTree/nodes/ScheduleFSMEvent";
import type { Evaluator } from "~/lib/behavior3/evaluator";
import { ExpressionEvaluator } from "~/lib/behavior3/evaluator";
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
   * 重写 compileCode 方法，增强表达式求值
   * 
   * 让表达式可以直接访问 owner 的属性（如 currentFrame、currentSkillStartupFrames）
   * 这样 Check 节点的条件表达式可以直接工作，无需手动同步 context → blackboard
   * 
   * 合并策略：blackboard 的值优先（运行时显式设置），owner 属性作为后备
   * 这样既支持动态值，又能直接访问 owner 属性，无需手动同步
   */
  override compileCode(code: string): Evaluator {
    // 先检查是否已经注册过这个表达式
    const existingEvaluator = (this as any)._evaluators?.[code];
    if (existingEvaluator) {
      // 返回一个包装的求值函数，合并 owner 属性和 blackboard 值
      return (values: ObjectType) => {
        // 合并策略：先使用 owner 属性作为基础，blackboard 的值会覆盖同名属性
        // 这样 blackboard 中显式设置的值优先，但表达式可以直接访问 owner 的属性
        // 为 magicCannon 提供默认值，避免 ExpressionEvaluator 在变量不存在时抛出错误
        const merged = { 
          ...this.owner, 
          magicCannon: values.magicCannon ?? { phase: 0, stacks: 0, hasGauge: false },
          ...values 
        };
        return existingEvaluator(merged);
      };
    }

    // 如果没有注册过，创建新的表达式求值器
    const expr = new ExpressionEvaluator(code);
    if (!expr.dryRun()) {
      throw new Error(`invalid expression: ${code}`);
    }

    // 注册求值器（使用原始版本，不包装）
    const evaluator = (envars: ObjectType) => expr.evaluate(envars);
    (this as any)._evaluators = (this as any)._evaluators || {};
    (this as any)._evaluators[code] = evaluator;

    // 返回包装后的求值函数，合并 owner 属性
    return (values: ObjectType) => {
      // 合并策略：先使用 owner 属性作为基础，blackboard 的值会覆盖同名属性
      // 为 magicCannon 提供默认值，避免 ExpressionEvaluator 在变量不存在时抛出错误
      const merged = { 
        ...this.owner, 
        magicCannon: values.magicCannon ?? { phase: 0, stacks: 0, hasGauge: false },
        ...values 
      };
      return evaluator(merged);
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

