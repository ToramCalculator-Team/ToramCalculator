import { PipelineDef, StagePool } from "../../runtime/Action/type";
import { MobStateContext } from "./MobStateMachine";
import { CommonStages } from "../../runtime/Action/CommonStages";

export const MobPipelineStages = {
  ...CommonStages,
} as const satisfies StagePool<MobStateContext>;

export type MobPipelineStages = typeof MobPipelineStages;

/**
 * Mob 的 PipelineDef 类型（不再提供代码常量定义）
 */
export type MobPipelineDef = PipelineDef<MobPipelineStages>;
