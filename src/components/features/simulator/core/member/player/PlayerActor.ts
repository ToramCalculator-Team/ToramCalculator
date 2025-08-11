import { Actor, createActor, EventObject, NonReducibleUnknown, setup, StateMachine, assign } from "xstate";
import { DataStorage, DataStorages, ExtractAttrPaths, ModifierType, ReactiveSystem } from "../ReactiveSystem";
import { PlayerAttrSchema } from "./PlayerData";
import { MemberWithRelations } from "@db/repositories/member";
import GameEngine from "../../GameEngine";
import { MemberActor, MemberContext, MemberEventType, MemberStateMachine } from "../MemberType";

/**
 * Player特有的事件类型
 * 扩展MemberEventType，包含Player特有的状态机事件
 */
type PlayerEventType =
  | MemberEventType
  | { type: "cast_end"; data: { skillId: string } } // 前摇结束
  | { type: "controlled"; data: { skillId: string } } // 受到控制
  | { type: "charge_end"; data: { skillId: string } } // 蓄力结束
  | { type: "hp_zero"; data: { skillId: string } } // HP小于等于0
  | { type: "control_end"; data: { skillId: string } } // 控制时间结束
  | { type: "revive_ready"; data: { skillId: string } } // 复活倒计时清零
  | { type: "skill_press"; data: { skillId: string } } // 按下技能
  | { type: "check_availability"; data: { skillId: string } } // 判断可用性
  | { type: "skill_animation_end"; data: { skillId: string } }; // 技能动作结束

// ============================== Player类 ==============================

export type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchema>>;

export const createPlayerActor = (props: {
  engine: GameEngine;
  memberData: MemberWithRelations;
  campId: string;
  reactiveDataManager: ReactiveSystem<PlayerAttrType>;
}): MemberActor<PlayerAttrType> => {
  const machineId = `Player_${props.memberData.id}`;
  const machine: MemberStateMachine<PlayerAttrType> = setup({
    types: {
      context: {} as MemberContext<PlayerAttrType>,
      events: {} as PlayerEventType,
      output: {} as MemberContext<PlayerAttrType>,
    },
    actions: {
      // 根据角色配置初始化玩家状态
      initializePlayerState: assign({
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

      // 技能相关事件
      onSkillStart: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 [${context.config.name}] 技能开始事件`, event);
      },

      onCastStart: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 [${context.config.name}] 前摇开始事件`, event);
        try {
          const data = (event as any)?.data || {};
          const skillId = data?.skillId;
          const currentFrame = context.engine.getFrameLoop().getFrameNumber();
          const executor = context.engine.getFrameLoop().getEventExecutor();

          // 扣除 MP（默认 1600，可表达式）
          let mpCost = 1600;
          if (typeof data?.mpCost === "number") mpCost = data.mpCost;
          if (typeof data?.mpCostExpr === "string" && data.mpCostExpr.trim()) {
            const res = executor.executeExpression(data.mpCostExpr, {
              currentFrame,
              caster: context.id,
              skill: { id: skillId },
            } as any);
            if (res.success && Number.isFinite(res.value)) mpCost = Math.max(0, Math.round(res.value));
          }
          const currentMp = context.attrs.getValue("mp.current");
          const newMp = Math.max(0, (typeof currentMp === "number" ? currentMp : 0) - mpCost);
          context.engine.getEventQueue().insert({
            id: `mp_cost_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            executeFrame: currentFrame,
            priority: "high",
            type: "custom",
            payload: { action: "modify_attribute", targetMemberId: context.id, attribute: "mp.current", value: newMp },
          });

          // 计算前摇帧数（默认 100，可表达式）
          let preCastFrames = 100;
          if (typeof data?.preCastFrames === "number") preCastFrames = Math.max(0, Math.round(data.preCastFrames));
          if (typeof data?.preCastExpr === "string" && data.preCastExpr.trim()) {
            const res = executor.executeExpression(data.preCastExpr, {
              currentFrame,
              caster: context.id,
              skill: { id: skillId },
            } as any);
            if (res.success && Number.isFinite(res.value)) preCastFrames = Math.max(0, Math.round(res.value));
          }

          // 调度前摇结束
          context.engine.getEventQueue().insert({
            id: `fsm_cast_end_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            executeFrame: currentFrame + preCastFrames,
            priority: "high",
            type: "member_fsm_event",
            payload: { targetMemberId: context.id, fsmEventType: "cast_end", data: { skillId } },
            source: "player_fsm",
            actionId: skillId ? `skill_${skillId}` : undefined,
          });
        } catch {}
      },

      onCastEnd: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 [${context.config.name}] 前摇结束事件`, event);
      },

      onSkillEffect: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 [${context.config.name}] 技能效果事件`, event);
        try {
          const data = (event as any)?.data || {};
          const skillId = data?.skillId;
          const currentFrame = context.engine.getFrameLoop().getFrameNumber();
          // 交给引擎执行技能效果；处理器完成后自行追加动画结束的 FSM 事件
          context.engine.getEventQueue().insert({
            id: `skill_effect_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            executeFrame: currentFrame,
            priority: "high",
            type: "skill_effect",
            payload: {
              memberId: context.id,
              skillId,
              animationFrames:
                typeof data?.animationFrames === "number" ? Math.max(0, Math.round(data.animationFrames)) : undefined,
              animationExpr: typeof data?.animationExpr === "string" ? data.animationExpr : undefined,
            },
            source: "player_fsm",
            actionId: skillId ? `skill_${skillId}` : undefined,
          });
        } catch {}
      },

      onSkillAnimationEnd: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 [${context.config.name}] 技能动画结束事件`, event);
      },

      onChargeStart: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 [${context.config.name}] 开始蓄力事件`, event);
        try {
          const data = (event as any)?.data || {};
          const skillId = data?.skillId;
          const currentFrame = context.engine.getFrameLoop().getFrameNumber();
          const executor = context.engine.getFrameLoop().getEventExecutor();

          let chargeFrames = 100;
          if (typeof data?.chargeFrames === "number") chargeFrames = Math.max(0, Math.round(data.chargeFrames));
          if (typeof data?.chargeExpr === "string" && data.chargeExpr.trim()) {
            const res = executor.executeExpression(data.chargeExpr, {
              currentFrame,
              caster: context.id,
              skill: { id: skillId },
            } as any);
            if (res.success && Number.isFinite(res.value)) chargeFrames = Math.max(0, Math.round(res.value));
          }

          context.engine.getEventQueue().insert({
            id: `fsm_charge_end_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            executeFrame: currentFrame + chargeFrames,
            priority: "high",
            type: "member_fsm_event",
            payload: {
              targetMemberId: context.id,
              fsmEventType: "charge_end",
              data: { skillId },
            },
            source: "player_fsm",
            actionId: skillId ? `skill_${skillId}` : undefined,
          });
        } catch {}
      },

      onChargeEnd: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 [${context.config.name}] 蓄力结束事件`, event);
      },

      // 处理死亡
      handleDeath: assign({
        isAlive: false,
        isActive: false,
      }),

      // 重置HP/MP并清除状态效果
      resetHpMpAndStatus: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 [${context.config.name}] 重置HP/MP并清除状态效果`);
        context.attrs.addModifier("hp.current", ModifierType.BASE_VALUE, context.attrs.getValue("hp.max"), {
          id: "revive",
          name: "系统重置",
          type: "system",
        });
        context.attrs.addModifier("mp.current", ModifierType.BASE_VALUE, context.attrs.getValue("mp.max"), {
          id: "revive",
          name: "系统重置",
          type: "system",
        });
        assign({
          isAlive: true,
          isActive: true,
        });
      },

      // 记录事件
      logEvent: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 [${context.config.name}] 的logEvent事件: ${event.type}`, event);
      },

      // 处理自定义事件（精简架构：FSM转换事件到EventQueue，保持统一执行）
      processCustomEvent: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🔄 [${context.config.name}] FSM转换自定义事件到执行队列:`, event.data);

        try {
          // FSM负责事件转换，不直接执行业务逻辑
          const gameEvent = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
            type: "custom" as const,
            priority: "normal" as const,
            executeFrame: context.engine.getFrameLoop().getFrameNumber() + 1, // 下一帧执行
            payload: {
              targetMemberId: context.id,
              memberType: context.config.type,
              action: event.data.action || "execute",
              scriptCode: event.data.scriptCode,
              attribute: event.data.attribute,
              value: event.data.value,
              sourceEvent: "fsm_custom",
              timestamp: Date.now(),
              ...event.data,
            },
            source: "player_fsm",
          };

          // 插入到事件队列，由EventExecutor统一处理
          context.engine.getEventQueue().insert(gameEvent);
          console.log(`✅ [${context.config.name}] 自定义事件已转换并加入执行队列`);
        } catch (error) {
          console.error(`❌ [${context.config.name}] FSM事件转换失败:`, error);
        }
      },
    },
    guards: {
      // 检查是否有后续连击步骤
      hasNextCombo: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 检查[${context.config.name}] 是否有后续连击步骤`);
        // 检查是否有后续连击步骤
        // 可以根据实际连击逻辑实现
        return false; // 暂时返回false，可以根据实际逻辑调整
      },

      // 检查当前技能是否有蓄力动作（正向 guard）
      hasChargeAction: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 检查[${context.config.name}] 技能是否有蓄力动作`);
        // TODO: 基于技能模板判断是否需要蓄力
        return false; // 先保留占位实现
      },

      // 技能可用性检查（汇总冷却/资源/状态）
      isSkillAvailable: ({ context, event }: { context: MemberContext<PlayerAttrType>; event: any }) => {
        console.log(`🎮 检查[${context.config.name}] 技能是否可用`);
        // TODO: 汇总沉默/冷却/MP/HP等检查
        return context.isActive;
      },

      // 检查玩家是否死亡
      isDead: ({ context }: { context: MemberContext<PlayerAttrType> }) => {
        const isDead = context.attrs.getValue("hp.current") <= 0;
        console.log(`🎮 检查[${context.config.name}] 是否死亡: ${isDead}`);
        return isDead;
      },

      // 检查玩家是否存活
      isAlive: ({ context }: { context: MemberContext<PlayerAttrType> }) => {
        const isAlive = context.attrs.getValue("hp.current") > 0;
        console.log(`🎮 检查[${context.config.name}] 是否存活: ${isAlive}`);
        return isAlive;
      },
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
    entry: {
      type: "initializePlayerState",
    },
    states: {
      alive: {
        initial: "operational",
        on: {
          hp_zero: {
            target: "dead",
            actions: ["handleDeath", "logEvent"],
          },
          damage: {
            actions: ["logEvent"],
          },
          heal: {
            actions: ["logEvent"],
          },
          move: {
            actions: ["logEvent"],
          },
          skill_start: {
            actions: ["logEvent"],
          },
          skill_end: {
            actions: ["logEvent"],
          },
          status_effect: {
            actions: ["logEvent"],
          },
          update: {
            actions: ["logEvent"],
          },
          custom: {
            actions: ["processCustomEvent", "logEvent"],
          },
        },
        description: "玩家存活状态，此时可操作且可影响上下文",
        states: {
          operational: {
            initial: "idle",
            on: {
              controlled: {
                target: "control_abnormal",
              },
            },
            description: "可响应输入操作",
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
                on: {
                  stop_move: {
                    target: "idle",
                  },
                },
              },
              skill_casting: {
                initial: "skill_init",
                states: {
                  skill_init: {
                    on: {
                      skill_press: [
                        {
                          target: "pre_cast",
                          guard: "isSkillAvailable",
                          actions: ["onSkillStart"],
                        },
                        // 默认分支：不可用时回到 idle，并提示
                        {
                          target: `#${machineId}.alive.operational.idle`,
                          actions: ["logEvent"],
                        },
                      ],
                    },
                  },
                  pre_cast: {
                    on: {
                      cast_end: [
                        {
                          target: "charge",
                          guard: "hasChargeAction",
                        },
                        // 默认分支：无蓄力则直接进入效果
                        {
                          target: "skill_effect",
                        },
                      ],
                    },
                    entry: {
                      type: "onCastStart",
                    },
                    exit: {
                      type: "onCastEnd",
                    },
                  },
                  skill_effect: {
                    on: {
                      skill_animation_end: [
                        {
                          target: "skill_init",
                          guard: "hasNextCombo",
                        },
                        {
                          target: `#${machineId}.alive.operational.idle`,
                        },
                      ],
                    },
                    entry: {
                      type: "onSkillEffect",
                    },
                    exit: {
                      type: "onSkillAnimationEnd",
                    },
                  },
                  charge: {
                    on: {
                      charge_end: {
                        target: "skill_effect",
                      },
                    },
                    entry: {
                      type: "onChargeStart",
                    },
                    exit: {
                      type: "onChargeEnd",
                    },
                  },
                },
              },
            },
          },
          control_abnormal: {
            on: {
              control_end: {
                target: `#${machineId}.alive.operational.idle`,
              },
            },
          },
        },
      },
      dead: {
        on: {
          revive_ready: {
            target: `#${machineId}.alive.operational`,
            actions: {
              type: "resetHpMpAndStatus",
            },
          },
        },
        description: "不可操作，中断当前行为，且移出上下文",
      },
    },
  });
  const actor = createActor(machine, {
    id: machineId,
  });

  return actor;
};
