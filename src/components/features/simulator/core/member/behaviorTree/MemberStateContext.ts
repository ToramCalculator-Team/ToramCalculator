import type { GameEngine } from "../../GameEngine";
import type { PipelineManager } from "../../pipeline/PipelineManager";
import type { PipeLineDef, StagePool } from "../../pipeline/PipelineStageType";

/**
 * 成员状态上下文通用接口
 * 所有成员类型（Player、Mob）的状态上下文都应实现此接口
 * 用于行为树节点访问通用功能
 */
export interface MemberStateContextBase {
  /** 成员ID */
  id: string;
  /** 引擎引用 */
  engine: GameEngine;
  /** 当前帧 */
  currentFrame: number;
  /** 管线管理器引用（泛型，具体类型由子类决定） */
  pipelineManager: PipelineManager<any, any, any>;
}

