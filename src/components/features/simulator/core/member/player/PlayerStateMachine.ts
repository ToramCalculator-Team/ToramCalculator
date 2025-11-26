import { assign, enqueueActions, EventObject, setup, sendTo } from "xstate";
import type { ActionFunction } from "xstate";
import type { GuardPredicate } from "xstate/guards";
import { createId } from "@paralleldrive/cuid2";
import { MemberEventType, MemberSerializeData, MemberStateMachine } from "../Member";
import { Player, PlayerAttrType } from "./Player";
import { ModifierType, StatContainer } from "../../dataSys/StatContainer";
import { SkillEffectWithRelations } from "@db/generated/repositories/skill_effect";
import { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { ExpressionContext, GameEngine } from "../../GameEngine";
import { MemberType } from "@db/schema/enums";
import { CharacterWithRelations } from "@db/generated/repositories/character";
import { PipelineManager } from "../../pipeline/PipelineManager";
import { playerPipDef, PlayerPipelineDef, PlayerStagePool } from "./PlayerPipelines";
import { behaviorTreeActor, type BehaviorTreeInput } from "./BehaviorTreeActor";
import { createTestSkillData } from "./testSkills";

/**
 * Player特有的事件类型
 * 扩展MemberEventType，包含Player特有的状态机事件
 */
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
interface 更新 extends EventObject {
  type: "更新";
  timestamp?: number;
}

export type PlayerEventType =
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
  | 切换目标
  | 更新;

import type { MemberStateContextBase } from "../behaviorTree/MemberStateContext";

// 定义 PlayerStateContext 类型（提前声明）
export interface PlayerStateContext extends MemberStateContextBase {
  /** 成员ID */
  id: string;
  /** 成员类型 */
  type: "Player";
  /** 成员名称 */
  name: string;
  /** 所属阵营ID */
  campId: string;
  /** 所属队伍ID */
  teamId: string;
  /** 成员目标ID */
  targetId: string;
  /** 是否存活 */
  isAlive: boolean;
  /** 引擎引用 */
  engine: GameEngine;
  /** 属性容器引用 */
  statContainer: StatContainer<PlayerAttrType>;
  /** 管线管理器引用 */
  pipelineManager: PipelineManager<PlayerPipelineDef, PlayerStagePool, PlayerStateContext>;
  /** 位置信息 */
  position: { x: number; y: number; z: number };
  /** 创建帧 */
  createdAtFrame: number;
  /** 当前帧 */
  currentFrame: number;
  /** 技能冷却 */
  skillCooldowns: number[];
  /** 正在施放的技能序号 */
  currentSkillIndex: number;
  /** 技能开始帧 */
  skillStartFrame: number;
  /** 技能结束帧 */
  skillEndFrame: number;
  /** 技能列表 */
  skillList: CharacterSkillWithRelations[];
  /** 正在执行的技能 */
  currentSkill: CharacterSkillWithRelations | null;
  /** 正在施放的技能效果 */
  currentSkillEffect: SkillEffectWithRelations | null;
  /** 前摇长度帧 */
  currentSkillStartupFrames: number;
  /** 蓄力长度帧 */
  currentSkillChargingFrames: number;
  /** 咏唱长度帧 */
  currentSkillChantingFrames: number;
  /** 发动长度帧 */
  currentSkillActionFrames: number;
  /** 状态标签组 */
  statusTags: string[];
  /** 仇恨值 */
  aggro: number;
  /** 机体配置信息 */
  character: CharacterWithRelations;
}

export const playerStateMachine = (player: Player) => {
  const machineId = player.id;

  const machine = setup({
    types: {
      context: {} as PlayerStateContext,
      events: {} as PlayerEventType,
      output: {} as Player,
    },
    actions: {
      根据角色配置生成初始状态: enqueueActions(({ context, event, enqueue }) => {
        console.log(`👤 [${context.name}] 根据角色配置生成初始状态`, context);
        // 通过引擎消息通道发送渲染命令（走 Simulation.worker 的 MessageChannel）
        const spawnCmd = {
          type: "render:cmd" as const,
          cmd: {
            type: "spawn" as const,
            entityId: context.id,
            name: context.name,
            position: { x: 0, y: 1, z: 0 },
            seq: 0,
            ts: Date.now(),
          },
        };
        // 引擎统一出口：通过已建立的MessageChannel发送渲染指令
        if (context.engine.postRenderMessage) {
          // 首选方案：使用引擎提供的统一渲染消息接口
          // 这个方法会通过 Simulation.worker 的 MessagePort 将指令发送到主线程
          console.log(`👤 [${context.name}] 发送渲染指令`, spawnCmd);
          context.engine.postRenderMessage(spawnCmd);
        } else {
          // 如果引擎的渲染消息接口不可用，记录错误但不使用fallback
          // 这确保我们只使用正确的通信通道，避免依赖全局变量
          console.error(`👤 [${context.name}] 无法发送渲染指令：引擎渲染消息接口不可用`);
        }
        
        // 初始化所有技能冷却
        const res = context.pipelineManager.run("skillCooldown.init", context, {});
        const skillCooldowns = res.stageOutputs.技能冷却初始化.skillCooldownResult;
        enqueue.assign({
          skillCooldowns: () => skillCooldowns,
        });
        console.log(`👤 [${context.name}] 技能冷却初始化完成`, skillCooldowns);
      }),
      更新玩家状态: enqueueActions(({ context, event, enqueue }) => {
        enqueue.assign({
          currentFrame: ({ context }) => context.currentFrame + 1,
        });
      }),
      启用站立动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 启用站立动画`, event);
      },
      启用移动动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 启用移动动画`, event);
      },
      显示警告: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 显示警告`, event);
      },
      创建警告结束通知: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 创建警告结束通知`, event);
      },
      发送快照获取请求: function ({ context, event }) {
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
      添加待处理技能: enqueueActions(({ context, event, enqueue }) => {
        console.log(`👤 [${context.name}] 添加待处理技能`, event);
        const e = event as 使用技能;
        const skillId = e.data.skillId;
        const skill = context.skillList.find((s) => s.id === skillId);
        if (!skill) {
          console.error(`🎮 [${context.name}] 技能不存在: ${skillId}`);
          return;
        }
        enqueue.assign({
          currentSkill: skill,
        });
      }),
      清空待处理技能: function ({ context, event }) {
        console.log(`👤 [${context.name}] 清空待处理技能`, event);
        context.currentSkill = null;
      },
      添加待处理技能效果: enqueueActions(({ context, enqueue }) => {
        const skillEffect = context.currentSkill?.template?.effects.find((e) =>
          context.engine.evaluateExpression(e.condition, {
            currentFrame: context.currentFrame,
            casterId: context.id,
            skillLv: context.currentSkill?.lv ?? 0,
          }),
        );
        if (!skillEffect) {
          console.error(`🎮 [${context.name}] 使用的技能${context.currentSkill?.template?.name}没有可用的效果`);
          return;
        }
        enqueue.assign({
          currentSkillEffect: skillEffect,
        });
      }),
      技能消耗扣除: enqueueActions(
        (
          { context, event, enqueue },
          params: {
            expressionEvaluator: (expression: string, context: ExpressionContext) => number;
            statContainer: StatContainer<PlayerAttrType>;
          },
        ) => {
          const e = event as 收到目标快照;
          console.log(`👤 [${context.name}] 状态机上下文中的当前技能效果：`, context.currentSkillEffect);
          console.log(`👤 [${context.name}] 技能消耗扣除`, event);
          const res = context.pipelineManager.run("skill.cost.calculate", context, {});
          enqueue.assign({
            aggro: context.aggro + res.stageOutputs.仇恨值计算.aggroResult,
          });
          console.log(
            `👤 [${context.name}] HP: ${context.statContainer.getValue("hp.current")}, MP: ${context.statContainer.getValue("mp.current")}`,
          );
        },
      ),
      启用前摇动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 启用前摇动画`, event);
      },
      计算前摇时长: enqueueActions(({ context, event, enqueue }) => {
        console.log(`👤 [${context.name}] 计算前摇时长`, event);
        const res = context.pipelineManager.run("skill.motion.calculate", context, {});
        console.log(`👤 [${context.name}] 计算前摇时长结果:`, res.stageOutputs.前摇帧数计算.startupFramesResult);
        enqueue.assign({
          currentSkillStartupFrames: res.stageOutputs.前摇帧数计算.startupFramesResult,
        });
      }),
      创建前摇结束通知: function ({ context, event }) {
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
      启用蓄力动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 启用蓄力动画`, event);
      },
      计算蓄力时长: enqueueActions(({ context, event, enqueue }) => {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 计算蓄力时长`, event);
      }),
      创建蓄力结束通知: function ({ context, event }) {
        console.log(`👤 [${context.name}] 创建蓄力结束通知`, event);

        // 计算蓄力结束的目标帧
        const targetFrame = context.currentFrame + context.currentSkillChargingFrames;

        // 向事件队列写入定时事件
        // 使用 member_fsm_event 类型，由 CustomEventHandler 处理
        context.engine.getEventQueue().insert({
          id: createId(), // 生成唯一事件ID
          type: "member_fsm_event",
          executeFrame: targetFrame,
          priority: "high",
          payload: {
            targetMemberId: context.id, // 目标成员ID
            fsmEventType: "收到蓄力结束通知", // 要发送给FSM的事件类型
            skillId: context.currentSkill?.id ?? "无法获取技能ID", // 技能ID
            source: "skill_charging", // 事件来源
          },
        });

        console.log(
          `👤 [${context.name}] 蓄力开始，${context.currentSkillChargingFrames}帧后结束 (当前帧: ${context.currentFrame}, 目标帧: ${targetFrame})`,
        );
      },
      启用咏唱动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 启用咏唱动画`, event);
      },
      计算咏唱时长: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 计算咏唱时长`, event);
      },
      创建咏唱结束通知: function ({ context, event }) {
        console.log(`👤 [${context.name}] 创建咏唱结束通知`, event);

        // 计算咏唱结束的目标帧
        const targetFrame = context.currentFrame + context.currentSkillChantingFrames;

        // 向事件队列写入定时事件
        // 使用 member_fsm_event 类型，由 CustomEventHandler 处理
        context.engine.getEventQueue().insert({
          id: createId(), // 生成唯一事件ID
          type: "member_fsm_event",
          executeFrame: targetFrame,
          priority: "high",
          payload: {
            targetMemberId: context.id, // 目标成员ID
            fsmEventType: "收到咏唱结束通知", // 要发送给FSM的事件类型
            skillId: context.currentSkill?.id ?? "无法获取技能ID", // 技能ID
            source: "skill_chanting", // 事件来源
          },
        });

        console.log(
          `👤 [${context.name}] 咏唱开始，${context.currentSkillChantingFrames}帧后结束 (当前帧: ${context.currentFrame}, 目标帧: ${targetFrame})`,
        );
      },
      启用技能发动动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 启用技能发动动画`, event);
      },
      计算发动时长: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 计算发动时长`, event);
      },
      创建发动结束通知: function ({ context, event }) {
        console.log(`👤 [${context.name}] 创建发动结束通知`, event);

        // 计算发动结束的目标帧
        const targetFrame = context.currentFrame + context.currentSkillActionFrames;

        // 向事件队列写入定时事件
        // 使用 member_fsm_event 类型，由 CustomEventHandler 处理
        context.engine.getEventQueue().insert({
          id: createId(), // 生成唯一事件ID
          type: "member_fsm_event",
          executeFrame: targetFrame,
          priority: "high",
          payload: {
            targetMemberId: context.id, // 目标成员ID
            fsmEventType: "收到发动结束通知", // 要发送给FSM的事件类型
            skillId: context.currentSkill?.id ?? "无法获取技能ID", // 技能ID
            source: "skill_action", // 事件来源
          },
        });

        console.log(
          `👤 [${context.name}] 发动开始，${context.currentSkillActionFrames}帧后结束 (当前帧: ${context.currentFrame}, 目标帧: ${targetFrame})`,
        );
      },
      技能效果管线: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 技能效果管线`, event);
      },
      重置控制抵抗时间: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 重置控制抵抗时间`, event);
      },
      中断当前行为: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 中断当前行为`, event);
      },
      启动受控动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 启动受控动画`, event);
      },
      重置到复活状态: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 重置到复活状态`, event);
      },
      发送快照到请求者: function ({ context, event }) {
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
      发送命中判定事件给自己: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 发送命中判定事件给自己`, event);
      },
      反馈命中结果给施法者: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 反馈命中结果给施法者`, event);
      },
      发送控制判定事件给自己: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 发送控制判定事件给自己`, event);
      },
      命中计算管线: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 命中计算管线`, event);
      },
      根据命中结果进行下一步: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 根据命中结果进行下一步`, event);
      },
      控制判定管线: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 控制判定管线`, event);
      },
      反馈控制结果给施法者: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 反馈控制结果给施法者`, event);
      },
      发送伤害计算事件给自己: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 发送伤害计算事件给自己`, event);
      },
      伤害计算管线: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 伤害计算管线`, event);
      },
      反馈伤害结果给施法者: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 反馈伤害结果给施法者`, event);
      },
      发送属性修改事件给自己: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 发送属性修改事件给自己`, event);
      },
      发送buff修改事件给自己: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 发送buff修改事件给自己`, event);
      },
      修改目标Id: function ({ context, event }, params: { targetId: string }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.name}] 修改目标Id`, event);
        context.targetId = params.targetId;
      },
      logEvent: function ({ context, event }) {
        console.log(`👤 [${context.name}] 日志事件`, event);
      },
      记录进入执行技能中状态: function ({ context }) {
        console.log(`🎮 [${context.name}] 进入"执行技能中"状态`);
      },
      发送TICK到行为树: enqueueActions(({ enqueue }) => {
        enqueue.sendTo("skillExecution", { type: "TICK" });
      }),
      转发前摇结束通知到行为树: enqueueActions(({ enqueue }) => {
        enqueue.sendTo("skillExecution", { type: "FSM_EVENT", fsmEventType: "收到前摇结束通知" });
      }),
      转发蓄力结束通知到行为树: enqueueActions(({ enqueue }) => {
        enqueue.sendTo("skillExecution", { type: "FSM_EVENT", fsmEventType: "收到蓄力结束通知" });
      }),
      转发咏唱结束事件到行为树: enqueueActions(({ enqueue }) => {
        enqueue.sendTo("skillExecution", { type: "FSM_EVENT", fsmEventType: "收到咏唱结束事件" });
      }),
      转发发动结束通知到行为树: enqueueActions(({ enqueue }) => {
        enqueue.sendTo("skillExecution", { type: "FSM_EVENT", fsmEventType: "收到发动结束通知" });
      }),
    },
    guards: {
      存在蓄力阶段: function ({ context, event }) {
        console.log(`👤 [${context.name}] 判断技能是否有蓄力阶段`, event);
    
        const effect = context.currentSkillEffect;
        if (!effect) {
          console.error(`👤 [${context.name}] 技能效果不存在`);
          return false;
        }
    
        const currentFrame = context.engine.getFrameLoop().getFrameNumber();
    
        // 蓄力阶段相关属性（假设使用chargeFixed和chargeModified）
        const reservoirFixed = context.engine.evaluateExpression(effect.reservoirFixed ?? "0", {
          currentFrame,
          casterId: context.id,
        });
        const reservoirModified = context.engine.evaluateExpression(effect.reservoirModified ?? "0", {
          currentFrame,
          casterId: context.id,
        });
        console.log(reservoirFixed + reservoirModified > 0 ? "有蓄力阶段" : "没有蓄力阶段");
        return reservoirFixed + reservoirModified > 0;
      },
      存在咏唱阶段: function ({ context, event }) {
        console.log(`👤 [${context.name}] 判断技能是否有咏唱阶段`, event);
        const effect = context.currentSkillEffect;
        if (!effect) {
          console.error(`👤 [${context.name}] 技能效果不存在`);
          return false;
        }
        const currentFrame = context.engine.getFrameLoop().getFrameNumber();
        const chantingFixed = context.engine.evaluateExpression(effect.chantingFixed ?? "0", {
          currentFrame,
          casterId: context.id,
        });
        const chantingModified = context.engine.evaluateExpression(effect.chantingModified ?? "0", {
          currentFrame,
          casterId: context.id,
        });
        console.log(chantingFixed + chantingModified > 0 ? "有咏唱阶段" : "没有咏唱阶段");
        return chantingFixed + chantingModified > 0;
      },
      存在后续连击: function ({ context, event }) {
        // Add your guard condition here
        return false;
      },
      没有可用技能效果: function ({ context, event }) {
        // Add your guard condition here
        console.log(`👤 [${context.name}] 判断技能是否有可用效果`, event);
        const e = event as 使用技能;
        const skillId = e.data.skillId;
        const currentFrame = context.engine.getFrameLoop().getFrameNumber();
    
        const skill = context.skillList.find((s) => s.id === skillId);
        if (!skill) {
          console.error(`🎮 [${context.name}] 技能不存在: ${skillId}`);
          return true;
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
          console.error(`🎮 [${context.name}] 技能效果不存在: ${skillId}`);
          return true;
        }
        console.log(`🎮 [${context.name}] 的技能 ${skill.template?.name} 可用`);
        return false;
      },
      还未冷却: function ({ context, event }) {
        const e = event as 使用技能;
        const res = context.skillCooldowns[context.currentSkillIndex];
        if (res == undefined) {
          console.log(`- 该技能不存在冷却时间`);
          return false;
        }
        if (res <= 0) {
          console.log(`- 该技能处于冷却状态`);
          return false;
        }
        console.log(`- 该技能未冷却，剩余冷却时间：${res}`);
        return true;
      },
      施法条件不满足: function ({ context, event }) {
        // 此守卫通过后说明技能可发动，则更新当前技能数据
        const e = event as 使用技能;
        const skillId = e.data.skillId;
        const currentFrame = context.engine.getFrameLoop().getFrameNumber();
    
        const skill = context.skillList.find((s) => s.id === skillId);
        if (!skill) {
          console.error(`🎮 [${context.name}] 技能不存在: ${skillId}`);
          return true;
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
          console.error(`🎮 [${context.name}] 技能效果不存在: ${skillId}`);
          return true;
        }
        const hpCost = context.engine.evaluateExpression(effect.hpCost ?? "throw new Error('技能消耗表达式不存在')", {
          currentFrame,
          casterId: context.id,
          skillLv: skill?.lv ?? 0,
        });
        const mpCost = context.engine.evaluateExpression(effect.mpCost ?? "throw new Error('技能消耗表达式不存在')", {
          currentFrame,
          casterId: context.id,
          skillLv: skill?.lv ?? 0,
        });
        if (
          hpCost > context.statContainer.getValue("hp.current") ||
          mpCost > context.statContainer.getValue("mp.current")
        ) {
          console.log(`- 该技能不满足施法消耗，HP:${hpCost} MP:${mpCost}`);
          // 这里需要撤回RS的修改
          return true;
        }
        console.log(`- 该技能满足施法消耗，HP:${hpCost} MP:${mpCost}`);
        return false;
      },
      技能带有心眼: function ({ context, event }) {
        return true;
      },
      目标不抵抗此技能的控制效果: function ({ context, event }) {
        // Add your guard condition here
        return true;
      },
      目标抵抗此技能的控制效果: function ({ context, event }) {
        // Add your guard condition here
        return true;
      },
      是物理伤害: function ({ context, event }) {
        // Add your guard condition here
        return true;
      },
      满足存活条件: function ({ context, event }) {
        // Add your guard condition here
        return true;
      },
    },
    actors: {
      behaviorTreeActor,
    },
  }).createMachine({
    context: {
      id: player.id,
      type: "Player",
      name: player.name,
      campId: player.campId,
      teamId: player.teamId,
      targetId: player.targetId,
      isAlive: player.isAlive,
      engine: player.engine,
      statContainer: player.statContainer,
      pipelineManager: player.pipelineManager,
      position: player.position,
      createdAtFrame: player.engine.getFrameLoop().getFrameNumber(),
      currentFrame: player.engine.getFrameLoop().getFrameNumber(),
      currentSkillStartupFrames: 0,
      currentSkillChargingFrames: 0,
      currentSkillChantingFrames: 0,
      currentSkillActionFrames: 0,
      // 默认第一个机体，如果没有技能则使用测试技能
      skillList: (() => {
        const skills = player.data.player?.characters?.[0]?.skills ?? [];
        // 如果没有技能，注入测试技能
        if (skills.length === 0) {
          console.log(`🧪 [${player.name}] 未找到技能，注入测试技能：魔法炮`);
          return [createTestSkillData()];
        }
        return skills;
      })(),
      // 默认第一个机体，如果没有技能则使用测试技能
      skillCooldowns: (() => {
        const skills = player.data.player?.characters?.[0]?.skills ?? [];
        // 如果没有技能，注入测试技能
        if (skills.length === 0) {
          return [0]; // 测试技能冷却
        }
        return skills.map((s) => 0);
      })(),
      currentSkillEffect: null,
      currentSkillIndex: 0,
      skillStartFrame: 0,
      skillEndFrame: 0,
      currentSkill: null,
      statusTags: [],
      aggro: 0,
      // 默认第一个机体
      character: player.data.player!.characters?.[0] ?? null,
    },
    id: machineId,
    initial: "存活",
    on: {
      更新: {
        actions: {
          type: "更新玩家状态",
        },
      },
    },
    entry: {
      type: "根据角色配置生成初始状态",
    },
    states: {
      存活: {
        initial: "可操作状态",
        on: {
          收到快照请求: {
            actions: {
              type: "发送快照到请求者",
            },
          },
          受到攻击: [
            {
              guard: "是物理伤害",
              actions: {
                type: "发送命中判定事件给自己",
              },
            },
            {
              guard: "是物理伤害",
              actions: [
                {
                  type: "反馈命中结果给施法者",
                },
                {
                  type: "发送控制判定事件给自己",
                },
              ],
            },
          ],
          进行命中判定: {
            actions: [
              {
                type: "命中计算管线",
              },
              {
                type: "反馈命中结果给施法者",
              },
              {
                type: "根据命中结果进行下一步",
              },
            ],
          },
          进行控制判定: {
            actions: [
              {
                type: "控制判定管线",
              },
              {
                type: "反馈控制结果给施法者",
              },
              {
                type: "发送伤害计算事件给自己",
              },
            ],
          },
          进行伤害计算: {
            actions: [
              {
                type: "伤害计算管线",
              },
              {
                type: "反馈伤害结果给施法者",
              },
              {
                type: "发送属性修改事件给自己",
              },
            ],
          },
          收到buff增删事件: {
            actions: [
              {
                type: "发送buff修改事件给自己",
              },
            ],
          },
          受到治疗: {
            target: "存活",
            actions: {
              type: "发送属性修改事件给自己",
            },
          },
          修改属性: [
            {
              target: "存活",
              guard: {
                type: "满足存活条件",
              },
            },
            {
              target: "死亡",
            },
          ],
          修改buff: {},
          切换目标: {
            actions: {
              type: "修改目标Id",
              params: ({ event }) => {
                const e = event as 切换目标;
                return { targetId: e.data.targetId };
              },
            },
          },
        },
        description: "玩家存活状态，此时可操作且可影响上下文",
        states: {
          可操作状态: {
            initial: "空闲状态",
            on: {
              应用控制: {
                target: "控制状态",
              },
            },
            description: "可响应输入操作",
            states: {
              空闲状态: {
                initial: "静止",
                on: {
                  使用格挡: {
                    target: "格挡状态",
                  },
                  使用闪躲: {
                    target: "闪躲中",
                  },
                  使用技能: {
                    target: "技能处理状态",
                  },
                },
                states: {
                  静止: {
                    on: {
                      移动: {
                        target: "移动中",
                      },
                    },
                    entry: {
                      type: "启用站立动画",
                    },
                  },
                  移动中: {
                    on: {
                      停止移动: {
                        target: "静止",
                      },
                    },
                    entry: {
                      type: "启用移动动画",
                    },
                  },
                },
              },
              格挡状态: {
                on: {
                  结束格挡: {
                    target: "空闲状态",
                  },
                },
              },
              闪躲中: {
                on: {
                  收到闪躲持续时间结束通知: {
                    target: "空闲状态",
                  },
                },
              },
              技能处理状态: {
                initial: "初始化技能",
                entry: {
                  type: "添加待处理技能",
                },
                exit: {
                  type: "清空待处理技能",
                },
                states: {
                  初始化技能: {
                    always: [
                      {
                        target: "警告状态",
                        guard: "没有可用技能效果",
                      },
                      {
                        target: "警告状态",
                        guard: "还未冷却",
                      },
                      {
                        target: "警告状态",
                        guard: "施法条件不满足",
                      },
                      {
                        target: "目标数据检查状态",
                        guard: "技能带有心眼",
                      },
                      {
                        target: "执行技能中",
                      },
                    ],
                  },
                  警告状态: {
                    on: {
                      收到警告结束通知: {
                        target: `#${machineId}.存活.可操作状态.空闲状态`,
                      },
                    },
                    entry: [
                      {
                        type: "显示警告",
                      },
                      {
                        type: "创建警告结束通知",
                      },
                    ],
                  },
                  目标数据检查状态: {
                    on: {
                      收到目标快照: [
                        {
                          target: "执行技能中",
                          guard: "目标不抵抗此技能的控制效果",
                        },
                        {
                          target: "警告状态",
                          guard: "目标抵抗此技能的控制效果",
                        },
                      ],
                    },
                    entry: [
                      {
                        type: "发送快照获取请求",
                      },
                    ],
                  },
                  执行技能中: {
                    entry: [
                      { type: "添加待处理技能效果" },
                      { type: "记录进入执行技能中状态" },
                    ],
                    invoke: {
                      id: "skillExecution",
                      src: "behaviorTreeActor",
                      input: ({ context }): BehaviorTreeInput => ({
                        skillEffect: context.currentSkillEffect,
                        owner: context,
                      }),
                    },
                    on: {
                      更新: {
                        actions: { type: "发送TICK到行为树" },
                      },
                      收到前摇结束通知: {
                        actions: { type: "转发前摇结束通知到行为树" },
                      },
                      收到蓄力结束通知: {
                        actions: { type: "转发蓄力结束通知到行为树" },
                      },
                      收到咏唱结束事件: {
                        actions: { type: "转发咏唱结束事件到行为树" },
                      },
                      收到发动结束通知: {
                        actions: { type: "转发发动结束通知到行为树" },
                      },
                      行为树执行完成: [
                        {
                          target: `#${machineId}.存活.可操作状态.技能处理状态`,
                          guard: "存在后续连击",
                        },
                        {
                          target: `#${machineId}.存活.可操作状态.空闲状态`,
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          控制状态: {
            on: {
              控制时间结束: {
                target: `#${machineId}.存活.可操作状态.空闲状态`,
              },
            },
            entry: [
              {
                type: "重置控制抵抗时间",
              },
              {
                type: "中断当前行为",
              },
              {
                type: "启动受控动画",
              },
            ],
          },
        },
      },
      死亡: {
        on: {
          复活: {
            target: `#${machineId}.存活.可操作状态`,
            actions: {
              type: "重置到复活状态",
            },
          },
        },
        description: "不可操作，中断当前行为",
      },
    },
  });

  return machine;
};
