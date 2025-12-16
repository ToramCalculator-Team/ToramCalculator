import type { PipelineMeta, StageMeta } from "../blocks";
import { buildStageMetas } from "../blocks";
import { PlayerActionPool } from "../../simulator/core/Member/types/Player/PlayerPipelines";

/**
 * selfType=Player 的“动作元数据来源”
 * 说明：
 * - 这里允许依赖 simulator runtime（ActionPool），但 logicEditor/blocks 目录本身不应直接依赖。
 * - builtinPipelineMetas 暂为空：目前编辑器主要通过 pipeline_definition 自定义语义管线。
 */
export const buildPlayerPipelineMetas = (): PipelineMeta[] => {
  return [];
};

export const buildPlayerStageMetas = (): StageMeta[] => {
  return buildStageMetas(PlayerActionPool as any);
};


