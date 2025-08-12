/**
 * Mob Actor（状态机）
 * 参考 PlayerActor，采用 Actor-first 架构。
 * - 上下文包含引擎、配置、ReactiveSystem 等引用
 * - 行为只产生意图/事件，由全局事件执行器处理副作用
 */

import { assign, createActor, setup, type Actor, type EventObject, type NonReducibleUnknown, type StateMachine } from "xstate";
import type { MemberWithRelations } from "@db/repositories/member";
import GameEngine from "../../GameEngine";
import { ReactiveSystem, ExtractAttrPaths, ModifierType } from "../ReactiveSystem";
import { MobAttrSchema } from "./MobData";
import { MemberActor, MemberContext, MemberEventType, MemberStateMachine } from "../MemberType";


/**
 * Mob 的属性键类型（基于 MobAttrSchema 提取 DSL 路径）
 */
export type MobAttrType = ExtractAttrPaths<ReturnType<typeof MobAttrSchema>>;

/**
 * Mob 专属的补充事件类型（可根据需要逐步扩展）
 */
type MobEventType =
  | MemberEventType
  | { type: "cast_end"; data: { skillId: string } }
  | { type: "controlled"; data: { skillId: string } }
  | { type: "charge_end"; data: { skillId: string } }
  | { type: "hp_zero"; data: { skillId: string } }
  | { type: "control_end"; data: { skillId: string } }
  | { type: "skill_press"; data: { skillId: string } }
  | { type: "check_availability"; data: { skillId: string } }
  | { type: "skill_animation_end"; data: { skillId: string } };

/**
 * 创建 Mob Actor
 */
export const createMobActor = (props: {
  engine: GameEngine;
  memberData: MemberWithRelations;
  campId: string;
  reactiveDataManager: ReactiveSystem<MobAttrType>;
}): MemberActor<MobAttrType> => {
  const machineId = `Mob_${props.memberData.id}`;

  const machine: MemberStateMachine<MobAttrType> = setup({
    types: {
      context: {} as MemberContext<MobAttrType>,
      events: {} as MobEventType,
      output: {} as MemberContext<MobAttrType>,
    },
    actions: {
      // 初始化 Mob 的基础上下文
      initializeMobState: assign({
        attrs: ({ context }) => context.attrs,
        engine: ({ context }) => context.engine,
        id: ({ context }) => context.id,
        campId: ({ context }) => context.campId,
        teamId: ({ context }) => context.teamId,
        targetId: ({ context }) => context.targetId,
        isAlive: true,
        isActive: true,
        lastUpdateTimestamp: 0,
        position: ({ context }) => context.position,
      }),

      // 技能开始
      onSkillStart: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        // 仅记录事件，实际效果由全局事件执行器处理
        console.log(`👹 [${context.config.name}] 技能开始事件`, event);
      },

      // 前摇开始/结束
      onCastStart: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        console.log(`👹 [${context.config.name}] 前摇开始事件`, event);
      },
      onCastEnd: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        console.log(`👹 [${context.config.name}] 前摇结束事件`, event);
      },

      // 技能效果与动画结束
      onSkillEffect: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        console.log(`👹 [${context.config.name}] 技能效果事件`, event);
      },
      onSkillAnimationEnd: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        console.log(`👹 [${context.config.name}] 技能动画结束事件`, event);
      },

      // 应用移动指令：更新位置
      applyMoveAssign: assign({
        position: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
          const pos = (event as any)?.data?.position;
          if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            return { x: Math.round(pos.x), y: Math.round(pos.y) };
          }
          return context.position;
        },
        lastUpdateTimestamp: () => Date.now(),
      }),

      // 退出移动时调度一次 stop_move（保证状态回到 idle）
      scheduleStopMove: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        try {
          const currentFrame = context.engine.getFrameLoop().getFrameNumber();
          const pos = (event as any)?.data?.position;
          context.engine.getEventQueue().insert({
            id: `mob_stop_move_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            executeFrame: currentFrame + 1,
            priority: 'high',
            type: 'member_fsm_event',
            payload: { targetMemberId: context.id, fsmEventType: 'stop_move', data: { position: pos } },
            source: 'mob_fsm',
          } as any);
        } catch {}
      },

      // 蓄力开始/结束
      onChargeStart: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        console.log(`👹 [${context.config.name}] 开始蓄力事件`, event);
      },
      onChargeEnd: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        console.log(`👹 [${context.config.name}] 蓄力结束事件`, event);
      },

      // 处理死亡
      handleDeath: assign({
        isAlive: false,
        isActive: false,
      }),

      // 记录事件
      logEvent: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        console.log(`👹 [${context.config.name}] 事件: ${event.type}`);
      },

      // FSM 只做事件→意图转换，交由全局执行器处理
      processCustomEvent: ({ context, event }: { context: MemberContext<MobAttrType>; event: any }) => {
        try {
          const data = (event as any)?.data || {};
          const currentFrame = context.engine.getFrameLoop().getFrameNumber();
          context.engine.getEventQueue().insert({
            id: `mob_custom_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            executeFrame: currentFrame,
            priority: "normal" as const,
            type: "custom",
            payload: {
              targetMemberId: context.id,
              memberType: context.config.type,
              action: data.action ?? "execute",
              scriptCode: data.scriptCode,
              attribute: data.attribute,
              value: data.value,
              sourceEvent: "mob_fsm",
              timestamp: Date.now(),
              ...data,
            },
            source: "mob_fsm",
          } as any);
        } catch (error) {
          console.error(`❌ [${context.config.name}] FSM事件转换失败:`, error);
        }
      },
    },
    guards: {
      // 是否还有后续连击（占位）
      hasNextCombo: () => false,
      // 是否需要蓄力（占位）
      hasChargeAction: () => false,
      // 技能可用性（简化：基于是否可行动）
      isSkillAvailable: ({ context }: { context: MemberContext<MobAttrType> }) => context.isActive,
      // 存活/死亡判断（基于属性）
      isDead: ({ context }: { context: MemberContext<MobAttrType> }) => context.attrs.getValue("hp.current") <= 0,
      isAlive: ({ context }: { context: MemberContext<MobAttrType> }) => context.attrs.getValue("hp.current") > 0,
    },
  }).createMachine({
    id: machineId,
    context: {
      config: props.memberData,
      attrs: props.reactiveDataManager,
      engine: props.engine,
      id: props.memberData.id,
      campId: props.campId,
      teamId: props.memberData.teamId,
      targetId: "",
      isAlive: true,
      isActive: true,
      lastUpdateTimestamp: 0,
      position: { x: 0, y: 0 },
    },
    initial: "alive",
    entry: { type: "initializeMobState" },
    states: {
      alive: {
        initial: "operational",
        on: {
          hp_zero: { target: "dead", actions: ["handleDeath", "logEvent"] },
          damage: { actions: ["logEvent"] },
          heal: { actions: ["logEvent"] },
          move: { actions: ["logEvent"] },
          skill_start: { actions: ["logEvent"] },
          skill_end: { actions: ["logEvent"] },
          status_effect: { actions: ["logEvent"] },
          update: { actions: ["logEvent"] },
          custom: { actions: ["processCustomEvent", "logEvent"] },
        },
        states: {
          operational: {
            initial: "idle",
            on: { controlled: { target: "control_abnormal" } },
            states: {
              idle: {
                on: {
                  move_command: { target: "moving" },
                  skill_press: [
                    {
                      guard: "isSkillAvailable",
                      target: "skill_casting.pre_cast",
                      actions: ["onSkillStart"],
                    },
                    {
                      target: `#${machineId}.alive.operational.idle`,
                      actions: ["logEvent"],
                    },
                  ],
                },
              },
              moving: {
                entry: { type: 'applyMoveAssign' },
                on: { stop_move: { target: "idle" } },
                exit: { type: 'scheduleStopMove' },
              },
              skill_casting: {
                initial: "skill_init",
                states: {
                  skill_init: {
                    on: {
                      skill_press: [
                        { target: "pre_cast", guard: "isSkillAvailable", actions: ["onSkillStart"] },
                        { target: `#${machineId}.alive.operational.idle`, actions: ["logEvent"] },
                      ],
                    },
                  },
                  pre_cast: {
                    on: {
                      cast_end: [
                        { target: "charge", guard: "hasChargeAction" },
                        { target: "skill_effect" },
                      ],
                    },
                    entry: { type: "onCastStart" },
                    exit: { type: "onCastEnd" },
                  },
                  skill_effect: {
                    on: {
                      skill_animation_end: [
                        { target: "skill_init", guard: "hasNextCombo" },
                        { target: `#${machineId}.alive.operational.idle` },
                      ],
                    },
                    entry: { type: "onSkillEffect" },
                    exit: { type: "onSkillAnimationEnd" },
                  },
                  charge: {
                    on: { charge_end: { target: "skill_effect" } },
                    entry: { type: "onChargeStart" },
                    exit: { type: "onChargeEnd" },
                  },
                },
              },
            },
          },
          control_abnormal: {
            on: { control_end: { target: `#${machineId}.alive.operational.idle` } },
          },
        },
      },
      dead: {
        description: "不可操作，中断当前行为，且移出上下文",
      },
    },
  });

  const actor = createActor(machine, { id: machineId });
  return actor;
};


