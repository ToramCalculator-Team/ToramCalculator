import type { CommonContext } from "../Agent/CommonContext";
import type { PipeLineDef, StagePool } from "./types";

/**
 * 共享阶段池。
 *
 * 当前先留空，作为后续：
 * - 通用命中阶段
 * - 通用伤害阶段
 * - 通用状态阶段辅助步骤
 * 的承载入口。
 */
export const CommonStages = {} as const satisfies StagePool<CommonContext>;

/**
 * 共享默认管线定义。
 *
 * 当前先留空，等待后续把更多“通用阶段”从业务切片中上提。
 */
export const CommonPipelineDef = {} as const satisfies PipeLineDef<typeof CommonStages>;
