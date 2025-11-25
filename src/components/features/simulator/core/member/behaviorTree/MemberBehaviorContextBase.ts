import type { GameEngine } from "../../GameEngine";
import type { PipelineManager } from "../../pipeline/PipelineManager";
import type { PipeLineDef, StagePool } from "../../pipeline/PipelineStageType";

/**
 * MemberBehaviorContextBase
 * 所有 Member 状态上下文的基础接口
 * 用于行为树节点的泛型约束
 */
export interface MemberBehaviorContextBase {
  /** 成员ID */
  id: string;
  /** 引擎引用 */
  engine: GameEngine;
  /** 当前帧 */
  currentFrame: number;
  /** 管线管理器引用 */
  pipelineManager: PipelineManager<any, any, any>;
}

