import { PipeLineDef, StagePool } from "../../runtime/Pipeline/PipelineStageType";
import { MobStateContext } from "./MobStateMachine";
import { CommonStages, CommonPipelineDef } from "../../runtime/Pipeline/CommonPipelines";

export const MobPipelineStages = {
  ...CommonStages,
} as const satisfies StagePool<MobStateContext>;

export type MobStagePool = typeof MobPipelineStages;

export const MobPipelineDef = {
  ...CommonPipelineDef,
} as const satisfies PipeLineDef<MobStagePool>;

export type MobPipelineDef = typeof MobPipelineDef;
