import { PipeLineDef, StagePool } from "../../runtime/Action/type";
import { MobStateContext } from "./MobStateMachine";
import { CommonStages, CommonPipelineDef } from "../../runtime/Action/CommonActions";

export const MobPipelineStages = {
  ...CommonStages,
} as const satisfies StagePool<MobStateContext>;

export type MobStagePool = typeof MobPipelineStages;

export const MobPipelineDef = {
  ...CommonPipelineDef,
} as const satisfies PipeLineDef<MobStagePool>;

export type MobPipelineDef = typeof MobPipelineDef;
