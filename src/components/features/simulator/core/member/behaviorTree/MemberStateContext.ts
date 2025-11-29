import { BuffManager } from "../../buff/BuffManager";
import { StatContainer } from "../../dataSys/StatContainer";
import type { GameEngine } from "../../GameEngine";
import type { PipelineManager } from "../../pipeline/PipelineManager";
import type { PipeLineDef, StagePool } from "../../pipeline/PipelineStageType";
import type { MemberType } from "@db/schema/enums";

/**
 * 成员状态上下文通用接口
 * 所有成员类型（Player、Mob）的状态上下文都应实现此接口
 * 用于行为树节点访问通用功能
 */
export interface MemberStateContext {
  /** 成员ID */
  id: string;
  /** 成员类型 */
  type: MemberType;
  /** 成员名称 */
  name: string;
  /** 所属阵营ID */
  campId: string;
  /** 所属队伍ID */
  teamId: string;
  /** 成员目标ID */
  targetId: string;
  /** 是否存活 */
  isAlive: boolean;
  /** 引擎引用 */
  engine: GameEngine;
  /** Buff管理器引用 */
  buffManager: BuffManager;
  /** 属性容器引用 */
  statContainer: StatContainer<string>;
  /** 管线管理器引用 */
  pipelineManager: PipelineManager<any, any, any>;
  /** 位置信息 */
  position: { x: number; y: number; z: number };
  /** 创建帧 */
  createdAtFrame: number;
  /** 当前帧 */
  currentFrame: number;
  /** 状态标签组 */
  statusTags: string[];
}

