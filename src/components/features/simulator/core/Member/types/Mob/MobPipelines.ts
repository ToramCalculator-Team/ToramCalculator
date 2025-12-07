import { PipeLineDef, StagePool } from "../../runtime/Pipeline/PipelineStageType";
import { MobStateContext } from "./MobStateMachine";
import { CombatStages, combatPipDef } from "../../runtime/Pipeline/CombatPipelines";

export const MobPipelineStages = {
  ...CombatStages,
} as const satisfies StagePool<MobStateContext>;

export type MobStagePool = typeof MobPipelineStages;

export const mobPipDef = {
  ...combatPipDef,
} as const satisfies PipeLineDef<MobStagePool>;

export type MobPipelineDef = typeof mobPipDef;
