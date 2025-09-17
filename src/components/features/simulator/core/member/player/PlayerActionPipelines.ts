import { z } from "zod/v3";
import { PlayerStateContext } from "./PlayerStateMachine";
import { createPipelineConfigCurry, defineActionPipelines } from "../../pipeline/PipelineStageType";
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

const createPlayerPipelineConfig = createPipelineConfigCurry<PlayerStateContext>();

const testPipeline = createPlayerPipelineConfig({
  definitions: [
    ["技能HP消耗计算", "skillHpCostResult", z.number()],
    ["技能MP消耗计算", "skillMpCostResult", z.number()],
    ["仇恨值计算", "aggressionResult", z.number()],
    ["仇恨值增加", "aggressionIncreaseResult", z.number()],
  ] as const,
  handlers: {
    技能HP消耗计算: (context, stageInput) => {
      return stageInput;
    },
    技能MP消耗计算: (context, stageInput) => {
      return stageInput;
    },
    仇恨值计算: (context, stageInput) => {
      context.skillHpCostResult;
      return stageInput;
    },
    仇恨值增加: (context, stageInput) => {
      return stageInput;
    },
  },
})

export const PlayerPipelines = defineActionPipelines<PlayerAction, PlayerStateContext, PlayerEventType>({
  根据角色配置生成初始状态: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 根据角色配置生成初始状态`, event);
      // 通过引擎消息通道发送渲染命令（走 Simulation.worker 的 MessageChannel）
      const spawnCmd = {
        type: "render:cmd" as const,
        cmd: {
          type: "spawn" as const,
          entityId: context.id,
          name: context.name,
          position: { x: 0, y: 0, z: 0 },
          seq: 0,
          ts: Date.now(),
        },
      };
      // 引擎统一出口：通过已建立的MessageChannel发送渲染指令
      if (context.engine.postRenderMessage) {
        // 首选方案：使用引擎提供的统一渲染消息接口
        // 这个方法会通过 Simulation.worker 的 MessagePort 将指令发送到主线程
        context.engine.postRenderMessage(spawnCmd);
      } else {
        // 如果引擎的渲染消息接口不可用，记录错误但不使用fallback
        // 这确保我们只使用正确的通信通道，避免依赖全局变量
        console.error(`👤 [${context.name}] 无法发送渲染指令：引擎渲染消息接口不可用`);
      }
    },
  },
  更新玩家状态: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: enqueueActions(({ context, event, enqueue }) => {
      enqueue.assign({
        currentFrame: ({ context }) => context.currentFrame + 1,
      });
    }),
  },
  启用站立动画: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 启用站立动画`, event);
    },
  },
  启用移动动画: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 启用移动动画`, event);
    },
  },
  显示警告: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 显示警告`, event);
    },
  },
  创建警告结束通知: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 创建警告结束通知`, event);
    },
  },
  发送快照获取请求: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      const e = event as 使用技能;
      console.log(`👤 [${context.name}] 发送快照获取请求`, event);
      const targetId = context.targetId;
      const target = context.engine.getMember(targetId);
      if (!target) {
        console.error(`👤 [${context.name}] 目标不存在: ${targetId}`);
        return;
      }
      target.actor.send({
        type: "收到快照请求",
        data: { senderId: context.id },
      });
    },
  },
  添加待处理技能: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 添加待处理技能`, event);
      const e = event as 使用技能;
      const skillId = e.data.skillId;
      const skill = context.skillList.find((s) => s.id === skillId);
      if (!skill) {
        console.error(`🎮 [${context.name}] 技能不存在: ${skillId}`);
        return;
      }
      context.currentSkill = skill;
    },
  },
  清空待处理技能: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: enqueueActions(({ context, event, enqueue }) => {
      console.log(`👤 [${context.name}] 清空待处理技能`, event);
      enqueue.assign({
        currentSkill: null,
      });
    }),
  },
  技能消耗扣除: {
    pipeline: createPlayerPipelineConfig({
      definitions: [
        ["技能HP消耗计算", "skillHpCostResult", z.number()],
        ["技能MP消耗计算", "skillMpCostResult", z.number()],
        ["仇恨值计算", "aggressionResult", z.number()],
        ["仇恨值增加", "aggressionIncreaseResult", z.number()],
      ] as const,
      handlers: {
        技能HP消耗计算: (context, stageInput) => {
          return stageInput;
        },
        技能MP消耗计算: (context, stageInput) => {
          return stageInput;
        },
        仇恨值计算: (context, stageInput) => {
          context.skillHpCostResult;
          return stageInput;
        },
        仇恨值增加: (context, stageInput) => {
          return stageInput;
        },
      },
    }),
    action: enqueueActions(
      (
        { context, event, enqueue },
        params: {
          expressionEvaluator: (expression: string, context: ExpressionContext) => number;
          statContainer: StatContainer<PlayerAttrType>;
        },
      ) => {
        console.log(`👤 [${context.name}] 技能消耗扣除`, event);
        const e = event as 收到目标快照;
        const currentFrame = context.currentFrame;

        const skill = context.currentSkill;
        if (!skill) {
          console.error(`🎮 [${context.name}] 技能不存在: ${context.currentSkill?.id}`);
          return;
        }

        const effect = skill.template?.effects.find((e) => {
          const result = context.engine.evaluateExpression(e.condition, {
            currentFrame,
            casterId: context.id,
            skillLv: skill?.lv ?? 0,
          });
          console.log(`🔍 技能效果条件检查: ${e.condition} = ${result} (类型: ${typeof result})`);
          return !!result; // 明确返回布尔值进行比较
        });
        if (!effect) {
          console.error(`🎮 [${context.name}] 技能效果不存在: ${context.currentSkill?.id}`);
          return;
        }

        enqueue.assign({
          currentSkillEffect: effect,
        });

        const hpCost = context.engine.evaluateExpression(effect.hpCost ?? "0", {
          currentFrame,
          casterId: context.id,
          skillLv: skill?.lv ?? 0,
        });
        const mpCost = context.engine.evaluateExpression(effect.mpCost ?? "0", {
          currentFrame,
          casterId: context.id,
          skillLv: skill?.lv ?? 0,
        });

        context.statContainer.addModifiers([
          {
            attr: "hp.current",
            targetType: ModifierType.STATIC_FIXED,
            value: -hpCost,
            source: { id: skill.id, name: skill.template?.name ?? "", type: "skill" },
          },
          {
            attr: "mp.current",
            targetType: ModifierType.STATIC_FIXED,
            value: -mpCost,
            source: { id: skill.id, name: skill.template?.name ?? "", type: "skill" },
          },
        ]);
        console.log(
          `👤 [${context.name}] HP: ${context.statContainer.getValue("hp.current")}, MP: ${context.statContainer.getValue("mp.current")}`,
        );
      },
    ),
  },
  启用前摇动画: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 启用前摇动画`, event);
    },
  },
  计算前摇时长: {
    pipeline: createPlayerPipelineConfig({
      definitions: [
        ["技能效果选择", "skillEffectResult", skill_effectSchema],
        ["技能固定动作时长计算", "skillFixedMotionResult", z.number()],
        ["技能可变动作时长计算", "skillModifiedMotionResult", z.number()],
        ["行动速度计算", "mspdResult", z.number()],
        ["前摇比例计算", "startupRatioResult", z.number()],
        ["前摇帧数计算", "startupFramesResult", z.number()],
      ] as const,
      handlers: {
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
        },
      },
    }),
    action: enqueueActions(({ context, event, enqueue }) => {
      console.log(`👤 [${context.name}] 计算前摇时长`, event);
      const startupFrames = context.pipelineManager.executePipeline("计算前摇时长", context, {});
      console.log(`👤 [${context.name}] 计算前摇时长结果:`, startupFrames);
      // const skill = context.currentSkill;
      // const effect = context.currentSkillEffect;
      // const currentFrame = context.currentFrame;
      // if (!effect) {
      //   console.error(`🎮 [${context.name}] 技能效果不存在: ${context.currentSkill?.id}`);
      //   return;
      // }
      // const motionFixed = Math.floor(
      //   context.engine.evaluateExpression(effect.motionFixed ?? "0", {
      //     currentFrame,
      //     casterId: context.id,
      //     skillLv: skill?.lv ?? 0,
      //   }),
      // );
      // const motionModified = Math.floor(
      //   context.engine.evaluateExpression(effect.motionModified ?? "0", {
      //     currentFrame,
      //     casterId: context.id,
      //     skillLv: skill?.lv ?? 0,
      //   }),
      // );
      // const mspd = Math.min(0.5, Math.floor(context.statContainer.getValue("mspd")));
      // console.log(`👤 [${context.name}] 固定帧：`, motionFixed);
      // console.log(`👤 [${context.name}] 可加速帧：`, motionModified);
      // console.log(`👤 [${context.name}] 当前行动速度：`, mspd);

      // const totalMotion = motionFixed + motionModified * (1 - mspd);
      // console.log(`👤 [${context.name}] 总帧数：`, totalMotion);

      // const startupRatio = context.engine.evaluateExpression(
      //   effect?.startupFrames ?? "throw new Error('前摇时长表达式不存在')",
      //   {
      //     currentFrame,
      //     casterId: context.id,
      //     skillLv: skill?.lv ?? 0,
      //   },
      // );
      // console.log(`👤 [${context.name}] 前摇比例：`, startupRatio);
      // const startupFrames = Math.floor(startupRatio * totalMotion);
      // console.log(`👤 [${context.name}] 前摇帧数：`, startupFrames);
      // enqueue.assign({
      //   currentSkillStartupFrames: startupFrames,
      // });
    }),
  },
  创建前摇结束通知: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log("🎮 创建前摇结束通知", event);

      // 计算前摇结束的目标帧
      const targetFrame = context.currentFrame + context.currentSkillStartupFrames;

      // 向事件队列写入定时事件
      // 使用 member_fsm_event 类型，由 CustomEventHandler 处理
      context.engine.getEventQueue().insert({
        id: createId(), // 生成唯一事件ID
        type: "member_fsm_event",
        executeFrame: targetFrame,
        priority: "high",
        payload: {
          targetMemberId: context.id, // 目标成员ID
          fsmEventType: "收到前摇结束通知", // 要发送给FSM的事件类型
          skillId: context.currentSkill?.id ?? "无法获取技能ID", // 技能ID
          source: "skill_front_swing", // 事件来源
        },
      });

      console.log(
        `👤 [${context.name}] 前摇开始，${context.currentSkillStartupFrames}帧后结束 (当前帧: ${context.currentFrame}, 目标帧: ${targetFrame})`,
      );
    },
  },
  启用蓄力动画: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 启用蓄力动画`, event);
    },
  },
  计算蓄力时长: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: enqueueActions(({ context, event, enqueue }) => {
      console.log(`👤 [${context.name}] 计算蓄力时长`, event);
    }),
  },
  创建蓄力结束通知: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 创建蓄力结束通知`, event);
    },
  },
  启用咏唱动画: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 启用咏唱动画`, event);
    },
  },
  计算咏唱时长: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 计算咏唱时长`, event);
    },
  },
  创建咏唱结束通知: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 创建咏唱结束通知`, event);
    },
  },
  启用技能发动动画: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 启用技能发动动画`, event);
    },
  },
  计算发动时长: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 计算发动时长`, event);
    },
  },
  创建发动结束通知: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 创建发动结束通知`, event);
    },
  },
  技能效果管线: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 技能效果管线`, event);
    },
  },
  重置控制抵抗时间: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 重置控制抵抗时间`, event);
    },
  },
  中断当前行为: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 中断当前行为`, event);
    },
  },
  启动受控动画: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 启动受控动画`, event);
    },
  },
  重置到复活状态: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 重置到复活状态`, event);
    },
  },
  发送快照到请求者: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      const e = event as 收到快照请求;
      const senderId = e.data.senderId;
      const sender = context.engine.getMember(senderId);
      if (!sender) {
        console.error(`👹 [${context.name}] 请求者不存在: ${senderId}`);
        return;
      }
      sender.actor.send({
        type: "收到目标快照",
        data: { senderId: context.id },
      });
    },
  },
  发送命中判定事件给自己: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 发送命中判定事件给自己`, event);
    },
  },
  反馈命中结果给施法者: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 反馈命中结果给施法者`, event);
    },
  },
  发送控制判定事件给自己: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 发送控制判定事件给自己`, event);
    },
  },
  命中计算管线: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 命中计算管线`, event);
    },
  },
  根据命中结果进行下一步: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 根据命中结果进行下一步`, event);
    },
  },
  控制判定管线: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 控制判定管线`, event);
    },
  },
  反馈控制结果给施法者: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 反馈控制结果给施法者`, event);
    },
  },
  发送伤害计算事件给自己: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 发送伤害计算事件给自己`, event);
    },
  },
  伤害计算管线: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 伤害计算管线`, event);
    },
  },
  反馈伤害结果给施法者: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 反馈伤害结果给施法者`, event);
    },
  },
  发送属性修改事件给自己: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 发送属性修改事件给自己`, event);
    },
  },
  发送buff修改事件给自己: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 发送buff修改事件给自己`, event);
    },
  },
  修改目标Id: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }, params: { targetId: string }) {
      console.log(`👤 [${context.name}] 修改目标Id`, event);
      context.targetId = params.targetId;
    },
  },
  logEvent: {
    pipeline: createPlayerPipelineConfig({
      definitions: [],
      handlers: {},
    }),
    action: function ({ context, event }) {
      console.log(`👤 [${context.name}] 日志事件`, event);
    },
  },
});
