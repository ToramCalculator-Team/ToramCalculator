import type { PlayerStateContext } from "./PlayerStateMachine";
import { MemberBehaviorTreeRuntime } from "../../runtime/BehaviorTree/MemberBehaviorTreeRuntime";

/**
 * PlayerBehaviorTreeRuntime
 * 玩家技能执行行为树的上下文
 * 
 * 设计要点：
 * - owner 是 PlayerStateContext，包含所有运行时数据
 * - 继承 MemberBehaviorTreeRuntime，具备通用节点/编译能力
 * - 如需额外节点或上下文扩展，可在此类内扩展
 */
export class PlayerBehaviorTreeRuntime extends MemberBehaviorTreeRuntime<PlayerStateContext> {
  constructor(owner: PlayerStateContext) {
    super(owner);
  }
}

