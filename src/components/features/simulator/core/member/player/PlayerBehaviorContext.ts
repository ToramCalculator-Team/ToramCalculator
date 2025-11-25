import { Context } from "~/lib/behavior3/context";
import type { Node } from "~/lib/behavior3/node";
import type { TreeData } from "~/lib/behavior3/tree";
import type { PlayerStateContext } from "./PlayerStateMachine";
import { RunPipeline } from "../behaviorTree/nodes/RunPipeline";
import { ScheduleFSMEvent } from "../behaviorTree/nodes/ScheduleFSMEvent";

/**
 * PlayerBehaviorContext
 * 玩家技能执行行为树的上下文
 * 
 * 设计要点：
 * - owner 是 PlayerStateContext，包含所有运行时数据
 * - time 直接使用 owner.currentFrame，确保与引擎帧同步
 * - 注册技能执行相关的自定义节点
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
      throw new Error(
        `PlayerBehaviorContext.loadTree: 路径 "${pathOrData}" 对应的树尚未加载。请先调用 loadTree(TreeData) 加载树数据，然后再创建 Tree 实例。`,
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

