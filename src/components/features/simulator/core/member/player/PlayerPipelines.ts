import { z } from "zod/v3";
import { PlayerStateContext } from "./PlayerStateMachine";
import { PipeLineDef, PipeStageFunDef } from "../../pipeline/PipelineStageType";
import { skill_effectSchema } from "@db/generated/zod";
import { enqueueActions, EventObject } from "xstate";
import { MemberEventType } from "../Member";
import { createId } from "@paralleldrive/cuid2";
import { ModifierType, StatContainer } from "../../dataSys/StatContainer";
import { ExpressionContext } from "../../GameEngine";
import { PlayerAttrType } from "./Player";

interface 复活 extends EventObject {
  type: "复活";
}
interface 移动 extends EventObject {
  type: "移动";
}
interface 停止移动 extends EventObject {
  type: "停止移动";
}
interface 使用格挡 extends EventObject {
  type: "使用格挡";
}
interface 结束格挡 extends EventObject {
  type: "结束格挡";
}
interface 使用闪躲 extends EventObject {
  type: "使用闪躲";
}
interface 收到闪躲持续时间结束通知 extends EventObject {
  type: "收到闪躲持续时间结束通知";
}
interface 使用技能 extends EventObject {
  type: "使用技能";
  data: { target: string; skillId: string };
}
interface 收到前摇结束通知 extends EventObject {
  type: "收到前摇结束通知";
  data: { skillId: string };
}
interface 收到蓄力结束通知 extends EventObject {
  type: "收到蓄力结束通知";
  data: { skillId: string };
}
interface 收到咏唱结束事件 extends EventObject {
  type: "收到咏唱结束事件";
  data: { skillId: string };
}
interface 收到发动结束通知 extends EventObject {
  type: "收到发动结束通知";
  data: { skillId: string };
}
interface 收到警告结束通知 extends EventObject {
  type: "收到警告结束通知";
}
interface 修改buff extends EventObject {
  type: "修改buff";
  data: { buffId: string; value: number };
}
interface 修改属性 extends EventObject {
  type: "修改属性";
  data: { attr: string; value: number };
}
interface 应用控制 extends EventObject {
  type: "应用控制";
}
interface 闪躲持续时间结束 extends EventObject {
  type: "闪躲持续时间结束";
}
interface 进行伤害计算 extends EventObject {
  type: "进行伤害计算";
}
interface 进行命中判定 extends EventObject {
  type: "进行命中判定";
}
interface 进行控制判定 extends EventObject {
  type: "进行控制判定";
}

interface 受到攻击 extends EventObject {
  type: "受到攻击";
  data: { origin: string; skillId: string };
}
interface 受到治疗 extends EventObject {
  type: "受到治疗";
  data: { origin: string; skillId: string };
}
interface 收到buff增删事件 extends EventObject {
  type: "收到buff增删事件";
  data: { buffId: string; value: number };
}
interface 收到快照请求 extends EventObject {
  type: "收到快照请求";
  data: { senderId: string };
}
interface 收到目标快照 extends EventObject {
  type: "收到目标快照";
  data: { senderId: string };
}
interface 切换目标 extends EventObject {
  type: "切换目标";
  data: { targetId: string };
}

type PlayerEventType =
  | MemberEventType
  | 复活
  | 移动
  | 停止移动
  | 使用格挡
  | 结束格挡
  | 使用闪躲
  | 收到闪躲持续时间结束通知
  | 使用技能
  | 收到前摇结束通知
  | 收到蓄力结束通知
  | 收到咏唱结束事件
  | 收到发动结束通知
  | 收到警告结束通知
  | 修改buff
  | 修改属性
  | 应用控制
  | 闪躲持续时间结束
  | 进行伤害计算
  | 进行命中判定
  | 进行控制判定
  | 受到攻击
  | 受到治疗
  | 收到buff增删事件
  | 收到快照请求
  | 收到目标快照
  | 切换目标;

// action的源定义，将用来约束状态机逻辑和管线树结构
export type PlayerAction =
  | { type: "根据角色配置生成初始状态"; params: {} }
  | { type: "更新玩家状态"; params: {} }
  | { type: "启用站立动画"; params: {} }
  | { type: "启用移动动画"; params: {} }
  | { type: "显示警告"; params: {} }
  | { type: "创建警告结束通知"; params: {} }
  | { type: "发送快照获取请求"; params: {} }
  | { type: "添加待处理技能"; params: {} }
  | { type: "清空待处理技能"; params: {} }
  | {
      type: "技能消耗扣除";
      params: {
        expressionEvaluator: (expression: string, context: ExpressionContext) => number;
        statContainer: StatContainer<PlayerAttrType>;
      };
    }
  | { type: "启用前摇动画"; params: {} }
  | { type: "计算前摇时长"; params: {} }
  | { type: "创建前摇结束通知"; params: {} }
  | { type: "启用蓄力动画"; params: {} }
  | { type: "计算蓄力时长"; params: {} }
  | { type: "创建蓄力结束通知"; params: {} }
  | { type: "启用咏唱动画"; params: {} }
  | { type: "计算咏唱时长"; params: {} }
  | { type: "创建咏唱结束通知"; params: {} }
  | { type: "启用技能发动动画"; params: {} }
  | { type: "计算发动时长"; params: {} }
  | { type: "创建发动结束通知"; params: {} }
  | { type: "技能效果管线"; params: {} }
  | { type: "重置控制抵抗时间"; params: {} }
  | { type: "中断当前行为"; params: {} }
  | { type: "启动受控动画"; params: {} }
  | { type: "重置到复活状态"; params: {} }
  | { type: "发送快照到请求者"; params: {} }
  | { type: "发送命中判定事件给自己"; params: {} }
  | { type: "反馈命中结果给施法者"; params: {} }
  | { type: "发送控制判定事件给自己"; params: {} }
  | { type: "命中计算管线"; params: {} }
  | { type: "根据命中结果进行下一步"; params: {} }
  | { type: "控制判定管线"; params: {} }
  | { type: "反馈控制结果给施法者"; params: {} }
  | { type: "发送伤害计算事件给自己"; params: {} }
  | { type: "伤害计算管线"; params: {} }
  | { type: "反馈伤害结果给施法者"; params: {} }
  | { type: "发送属性修改事件给自己"; params: {} }
  | { type: "发送buff修改事件给自己"; params: {} }
  | { type: "修改目标Id"; params: { targetId: string } }
  | { type: "logEvent"; params: {} };

export type PlayerActionsType = PlayerAction["type"];



/**
 * 管线定义，用于zod验证和blockly生成
 */
export const playerPipDef = {
  技能消耗扣除: [
    ["技能HP消耗计算", z.object({ skillHpCostResult: z.number() })],
    ["技能MP消耗计算", z.object({ skillMpCostResult: z.number() })],
    ["仇恨值计算", z.object({ aggroResult: z.number() })],
  ],
  计算前摇时长: [
    ["技能固定动作时长计算", z.object({ skillFixedMotionResult: z.number() })],
    ["技能可变动作时长计算", z.object({ skillModifiedMotionResult: z.number() })],
    ["行动速度计算", z.object({ mspdResult: z.number() })],
    ["前摇比例计算", z.object({ startupProportion: z.number() })],
    ["前摇帧数计算", z.object({ startupFramesResult: z.number() })],
  ],
  根据角色配置生成初始状态: [],
  更新玩家状态: [],
  启用站立动画: [],
  启用移动动画: [],
  显示警告: [],
  创建警告结束通知: [],
  发送快照获取请求: [],
  添加待处理技能: [],
  清空待处理技能: [],
  启用前摇动画: [],
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
  logEvent: [],
} as const satisfies PipeLineDef<PlayerActionsType>;

export type PlayerPipelineDef = typeof playerPipDef;

/**
 * 管线阶段函数定义，用于运行
 */
export const playerPipFunDef: PipeStageFunDef<PlayerAction, PlayerPipelineDef, PlayerStateContext> = {
  技能消耗扣除: {
    技能HP消耗计算: (context, stageInput) => {
      console.log(`👤 [${context.name}] 技能HP消耗计算`);
      const hpCostExpression = context.currentSkillEffect?.hpCost;
      if (!hpCostExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能效果不存在`);
      }
      const hpCost = context.engine.evaluateExpression(hpCostExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return {
        skillHpCostResult: hpCost,
      };
    },
    技能MP消耗计算: (context, stageInput) => {
      const mpCostExpression = context.currentSkillEffect?.mpCost;
      if (!mpCostExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能效果不存在`);
      }
      const mpCost = context.engine.evaluateExpression(mpCostExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return {
        skillMpCostResult: mpCost,
      };
    },
    仇恨值计算: (context, stageInput) => {
      const aggro = context.skillMpCostResult * context.statContainer.getValue("aggro.rate");
      return {
        aggroResult: aggro,
      };
    },
  },
  计算前摇时长: {
    技能固定动作时长计算: (context, stageInput) => {
      const fixedMotionExpression = context.currentSkillEffect?.motionFixed;
      const skill = context.currentSkill;
      if (!skill || !fixedMotionExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const fixedMotion = context.engine.evaluateExpression(fixedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      return {
        skillFixedMotionResult: fixedMotion,
      };
    },
    技能可变动作时长计算: (context, stageInput) => {
      const modifiedMotionExpression = context.currentSkillEffect?.motionModified;
      const skill = context.currentSkill;
      if (!skill || !modifiedMotionExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const modifiedMotion = context.engine.evaluateExpression(modifiedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      return {
        skillModifiedMotionResult: modifiedMotion,
      };
    },
    行动速度计算: (context, stageInput) => {
      const mspd = context.statContainer.getValue("mspd");
      return {
        mspdResult: mspd,
      };
    },
    前摇比例计算: (context, stageInput) => {
      const startupProportion = context.currentSkillEffect?.startupProportion;
      console.log(`👤 [${context.name}] 当前技能效果的启动比例：`, startupProportion);
      if (!startupProportion) {
        throw new Error(`🎮 [${context.name}] 的当前技能前摇比例数据不存在`);
      }
      return {
        startupProportion: startupProportion,
      };
    },
    前摇帧数计算: (context, stageInput) => {
      const startupFrames = (context.skillFixedMotionResult + context.skillModifiedMotionResult * context.mspdResult) * context.startupProportion;
      return {
        startupFramesResult: startupFrames,
      };
    },
  },
  根据角色配置生成初始状态: {},
  更新玩家状态: {},
  启用站立动画: {},
  启用移动动画: {},
  显示警告: {},
  创建警告结束通知: {},
  发送快照获取请求: {},
  添加待处理技能: {},
  清空待处理技能: {},
  启用前摇动画: {},
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
  logEvent: {},
};