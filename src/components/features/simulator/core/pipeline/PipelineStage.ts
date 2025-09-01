import { CharacterWithRelations } from "@db/repositories/character";
import { PipelineStageHandlers, PipelineStageEvent } from "./PipelineStageType";

// 示例：定义 '技能消耗扣除' 阶段的具体处理函数
const handleSkillCostDeduction: PipelineStageHandlers<{}>[PipelineStageEvent.SkillCostDeduction] = (
    context,
    stageInput, // 在这个阶段，stageInput 实际上就是 z.object({ hpCost: z.number(), mpCost: z.number() }) 的推断类型
  ) => {
      // 可以在这里访问前置阶段的输出
      console.log("技能效果选择的结果:", context.skillEffectResult);
      console.log("技能射程计算的结果:", context.skillRangeResult);
  
      // 假设根据 stageInput 进行计算
    return {
      hpCost: stageInput.hpCost + 10, // 示例：额外扣除10
      mpCost: stageInput.mpCost + 5,
    };
  };
  
  // 另一个处理函数示例
  const handleSkillEffectSelection: PipelineStageHandlers<{ character: CharacterWithRelations }>[PipelineStageEvent.SkillEffectSelection] = (
      context,
      stageInput // 在这个阶段，stageInput 实际上就是 z.infer<typeof skill_effectSchema>
  ) => {
      console.log("当前角色信息:", context.character.name);
      // 这里可以根据角色信息和其他上下文来选择并返回具体的技能效果
      return stageInput; // 示例：直接返回输入，实际可能根据逻辑进行选择或修改
  };