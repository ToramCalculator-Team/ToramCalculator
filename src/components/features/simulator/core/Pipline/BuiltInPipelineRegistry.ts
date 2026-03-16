import type { CommonContext } from "../Member/runtime/Agent/CommonContext";
import { CommonPipelineDef, CommonStages } from "./CommonPipelines";
import { PipelineRegistry } from "./PipelineRegistry";
import { StatusPipelineDef, StatusStages } from "./StatusPipelines";
import type { ActionPool, PipeLineDef, StagePool } from "./types";

/**
 * 引擎内建阶段池。
 *
 * 说明：
 * - 这里只负责组合默认阶段池
 * - 具体阶段实现按领域拆分在独立文件中
 */
export const BuiltInStages = {
	...CommonStages,
	...StatusStages,
} as const satisfies StagePool<CommonContext>;

/**
 * 引擎内建默认管线定义。
 *
 * 说明：
 * - 这里只负责组合默认管线定义
 * - 具体管线定义按领域拆分在独立文件中
 */
export const BuiltInPipelineDef = {
	...CommonPipelineDef,
	...StatusPipelineDef,
} as const satisfies PipeLineDef<typeof BuiltInStages>;

export const createBuiltInPipelineRegistry = () =>
	new PipelineRegistry<CommonContext, ActionPool<CommonContext>>(BuiltInStages, BuiltInPipelineDef);
