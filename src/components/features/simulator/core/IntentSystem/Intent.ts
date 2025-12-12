/**
 * Intent 模型：执行单元（SkillBT/BuffBT/AreaBT/状态机逻辑）产出的副作用请求
 *
 * 命名约定：
 * - Intent：描述“要发生什么副作用”
 * - Pipeline：结算流程编排（actionGroup）
 * - Stage：Pipeline 内的计算/结算步骤（actionPool 内的 action）
 * - FsmAction：XState 内部副作用描述（推荐仅产出 Intent，不直接改世界）
 */

import type { BuffInstance } from "../Member/runtime/Buff/BuffManager";
import type { ModifierType } from "../Member/runtime/StatContainer/StatContainer";

export interface IntentBase {
  /** 触发源标识（技能ID、buffID、区域ID 等） */
  source: string;
  /** 发起者（所属 member 或 area） */
  actorId: string;
  /** 可选：主要影响的目标 */
  targetId?: string;
  /** 可选：优先级，用于在需要时做排序/裁决 */
  priority?: number;
  /** 可选：调试信息 */
  debugLabel?: string;
  /** 可选：产生该意图的帧号 */
  frame?: number;
}

export interface SendFsmEventIntent extends IntentBase {
  type: "sendFsmEvent";
  event: any;
}

export interface RunPipelineIntent extends IntentBase {
  type: "runPipeline";
  /** 管线/动作组名称 */
  pipeline: string;
  /** 传给管线的参数（将写入 ctx 拷贝） */
  params?: Record<string, any>;
}

export interface AddBuffIntent extends IntentBase {
  type: "addBuff";
  targetId: string;
  buff: BuffInstance;
  /** 如果已存在同 ID，是否覆盖/刷新 */
  replaceIfExists?: boolean;
}

export interface RemoveBuffIntent extends IntentBase {
  type: "removeBuff";
  targetId: string;
  buffId: string;
}

export interface ModifyStatIntent extends IntentBase {
  type: "modifyStat";
  targetId: string;
  changes: Array<{
    path: string;
    modifierType: ModifierType;
    value: number;
  }>;
}

export interface InsertPipelineStageIntent extends IntentBase {
  type: "insertPipelineStage";
  targetId?: string;
  pipeline: string;
  afterStage: string;
  /** 插入的 stage 名称（必须在 actionPool 中存在） */
  insertStage: string;
  /** 可选：执行该 stage 前额外合并到输入的 params（纯数据） */
  params?: Record<string, unknown>;
  /** 唯一标识（便于后续移除或幂等） */
  stageId: string;
  priority?: number;
}

export interface RemovePipelineStagesBySourceIntent extends IntentBase {
  type: "removePipelineStagesBySource";
  targetId?: string;
  pipeline?: string;
  stageName?: string;
  removeSource: string;
}

export type Intent =
  | SendFsmEventIntent
  | RunPipelineIntent
  | AddBuffIntent
  | RemoveBuffIntent
  | ModifyStatIntent
  | InsertPipelineStageIntent
  | RemovePipelineStagesBySourceIntent;


