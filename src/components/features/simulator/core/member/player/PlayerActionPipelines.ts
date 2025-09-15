import { z } from "zod/v3";
import { playerActions, PlayerStateContext } from "./PlayerStateMachine";
import { ActionsPipelineDefinitions, ActionsPipelineHanders } from "../../pipeline/PipelineStageType";
import { skill_effectSchema } from "@db/generated/zod";

// actions分阶段定义
// 静态IO定义，将用于blockly的块生成
export const PlayerPipelineDefinitions = {
  根据角色配置生成初始状态: [],
  更新玩家状态: [],
  启用站立动画: [],
  启用移动动画: [],
  显示警告: [],
  创建警告结束通知: [],
  发送快照获取请求: [],
  添加待处理技能: [],
  清空待处理技能: [],
  技能消耗扣除: [
    ["技能HP消耗计算", "skillHpCostResult", z.number()],
    ["技能MP消耗计算", "skillMpCostResult", z.number()],
  ],
  启用前摇动画: [],
  计算前摇时长: [
    ["技能效果选择", "skillEffectResult", skill_effectSchema],
    ["技能固定动作时长计算", "skillFixedMotionResult", z.number()],
    ["技能可变动作时长计算", "skillModifiedMotionResult", z.number()],
    ["行动速度计算", "mspdResult", z.number()],
    ["前摇比例计算", "startupRatioResult", z.number()],
    ["前摇帧数计算", "startupFramesResult", z.number()],
  ],
  创建前摇结束通知: [],
  启用蓄力动画: [],
  计算蓄力时长: [],
  创建蓄力结束通知: [],
  启用咏唱动画: [],
  计算咏唱时长: [],
  创建咏唱结束通知: [],
  启用技能发动动画: [],
  计算发动时长: [],
  创建发动结束通知: [],
  技能效果管线: [],
  重置控制抵抗时间: [],
  中断当前行为: [],
  启动受控动画: [],
  重置到复活状态: [],
  发送快照到请求者: [],
  发送命中判定事件给自己: [],
  反馈命中结果给施法者: [],
  发送控制判定事件给自己: [],
  命中计算管线: [],
  根据命中结果进行下一步: [],
  控制判定管线: [],
  反馈控制结果给施法者: [],
  发送伤害计算事件给自己: [],
  伤害计算管线: [],
  反馈伤害结果给施法者: [],
  发送属性修改事件给自己: [],
  发送buff修改事件给自己: [],
  修改目标Id: [],
  logEvent: []
} as const satisfies ActionsPipelineDefinitions<keyof typeof playerActions>;

// 静态管线定义，这是游戏计算逻辑的基本规则，动态管线阶段将在这些阶段的后方插入
export const PlayerPipelineHanders: ActionsPipelineHanders<keyof typeof playerActions, typeof PlayerPipelineDefinitions, PlayerStateContext> = {
  根据角色配置生成初始状态: {},
  更新玩家状态: {},
  启用站立动画: {},
  启用移动动画: {},
  显示警告: {},
  创建警告结束通知: {},
  发送快照获取请求: {},
  添加待处理技能: {},
  清空待处理技能: {},
  技能消耗扣除: {
    技能HP消耗计算: (context, stageInput) => {
      return stageInput;
    },
    技能MP消耗计算: (context, stageInput) => {
      return stageInput;
    },
  },
  启用前摇动画: {},
  计算前摇时长: {
    技能效果选择: (context, stageInput) => {
      const skillEffect = context.currentSkillEffect;
      if (!skillEffect) {
        throw new Error(`🎮 [${context.name}] 的当前技能效果不存在`);
      }
      return skillEffect;
    },
    技能固定动作时长计算: (context, stageInput) => {
      const fixedMotionExpression = context.skillEffectResult.motionFixed;
      const skill = context.currentSkill;
      if (!skill) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const fixedMotion = context.engine.evaluateExpression(fixedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      return fixedMotion;
    },
    技能可变动作时长计算: (context, stageInput) => {
      const skill = context.currentSkill;
      if (!skill) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const modifiedMotionExpression = context.skillEffectResult.motionModified;
      const modifiedMotion = context.engine.evaluateExpression(modifiedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      return modifiedMotion;
    },
    行动速度计算: (context, stageInput) => {
      const mspd = context.statContainer.getValue("mspd");
      return mspd;
    },
    前摇比例计算: (context, stageInput) => {
      const startupRatioExpression = context.skillEffectResult.startupFrames;
      const startupRatio = context.engine.evaluateExpression(startupRatioExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return startupRatio;
    },
    前摇帧数计算: (context, stageInput) => {
      const startupFramesExpression = context.skillEffectResult.startupFrames;
      const startupFrames = context.engine.evaluateExpression(startupFramesExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return startupFrames;
    }
  },
  创建前摇结束通知: {},
  启用蓄力动画: {},
  计算蓄力时长: {},
  创建蓄力结束通知: {},
  启用咏唱动画: {},
  计算咏唱时长: {},
  创建咏唱结束通知: {},
  启用技能发动动画: {},
  计算发动时长: {},
  创建发动结束通知: {},
  技能效果管线: {},
  重置控制抵抗时间: {},
  中断当前行为: {},
  启动受控动画: {},
  重置到复活状态: {},
  发送快照到请求者: {},
  发送命中判定事件给自己: {},
  反馈命中结果给施法者: {},
  发送控制判定事件给自己: {},
  命中计算管线: {},
  根据命中结果进行下一步: {},
  控制判定管线: {},
  反馈控制结果给施法者: {},
  发送伤害计算事件给自己: {},
  伤害计算管线: {},
  反馈伤害结果给施法者: {},
  发送属性修改事件给自己: {},
  发送buff修改事件给自己: {},
  修改目标Id: {},
  logEvent: {}
}
