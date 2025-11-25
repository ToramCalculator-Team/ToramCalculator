import { PipeLineDef, StagePool } from "../../pipeline/PipelineStageType";
import { MobStateContext } from "./MobStateMachine";

/**
 * 目前怪物尚未使用管线系统，这里提供空的阶段池与管线定义占位，方便未来扩展。
 */

export const MobPipelineStages = {} as const satisfies StagePool<MobStateContext>;

export type MobStagePool = typeof MobPipelineStages;

export const mobPipDef = {} as const satisfies PipeLineDef<MobStagePool>;

export type MobPipelineDef = typeof mobPipDef;