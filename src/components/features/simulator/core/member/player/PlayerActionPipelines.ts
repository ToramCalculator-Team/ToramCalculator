import { z } from "zod/v3";
import { PlayerStateContext } from "./PlayerStateMachine";
import { PipelineStageHandlers } from "../../pipeline/PipelineStageType";
import { skill_effectSchema } from "@db/generated/zod";

// actions分阶段定义

// 初始化
export const InitActionDefinitions = [
  ["技能效果选择", "skillEffectResult", skill_effectSchema],
  ["技能射程计算", "skillRangeResult", z.number()],
  [
    "技能消耗扣除",
    "skillCostResult",
    z.object({
      hpCost: z.number().default(0), // 增加default方便 schemaToObject
      mpCost: z.number().default(0),
    }),
  ],
] as const;

// 定义示例管线的处理函数
const InitActionHandlers: PipelineStageHandlers<typeof InitActionDefinitions, PlayerStateContext> = {
  技能效果选择: (context, stageInput) => {
    console.log("当前角色信息:", context.character.name);
    console.log("当前帧:", context.currentFrame);
    // 这里可以根据角色信息和其他上下文来选择并返回具体的技能效果
    return stageInput; // 示例：直接返回输入，实际可能根据逻辑进行选择或修改
  },

  技能射程计算: (context, stageInput) => {
    // 可以在这里访问前置阶段的输出
    console.log("技能效果选择的结果:", context.skillEffectResult);
    console.log("角色信息:", context.character.name);

    // 假设根据技能效果计算射程
    const baseRange = 100;
    return baseRange + stageInput; // 示例：在输入基础上增加基础射程
  },

  技能消耗扣除: (context, stageInput) => {
    // 可以在这里访问前置阶段的输出
    console.log("技能效果选择的结果:", context.skillEffectResult);
    console.log("技能射程计算的结果:", context.skillRangeResult);
    console.log("角色信息:", context.character.name);

    // 假设根据 stageInput 进行计算
    return {
      hpCost: stageInput.hpCost + 10, // 示例：额外扣除10
      mpCost: stageInput.mpCost + 5,
    };
  },
};
