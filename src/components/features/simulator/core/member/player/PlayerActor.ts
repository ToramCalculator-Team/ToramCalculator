import { createActor, setup, assign, EventObject } from "xstate";
import { ExtractAttrPaths, ModifierType, ReactiveSystem } from "../ReactiveSystem";
import { PlayerAttrSchema } from "./PlayerData";
import { Member, MemberEventType, MemberStateMachine } from "../Member";
import { evalAstExpression } from "./PrebattleModifiers";

/**
 * Player特有的事件类型
 * 扩展MemberEventType，包含Player特有的状态机事件
 */
// 技能按下
interface PlayerSkillPressEvent extends EventObject {
  type: "使用技能";
  data: { skillId: string };
}
// 前摇结束
interface PlayerCastEndEvent extends EventObject {
  type: "cast_end";
  data: { skillId: string };
}
// 受到控制
interface PlayerControlledEvent extends EventObject {
  type: "controlled";
  data: { skillId: string };
}
// 蓄力结束
interface PlayerChargeEndEvent extends EventObject {
  type: "charge_end";
  data: { skillId: string };
}
// HP小于等于0
interface PlayerHpZeroEvent extends EventObject {
  type: "hp_zero";
  data: { skillId: string };
}
// 控制时间结束
interface PlayerControlEndEvent extends EventObject {
  type: "control_end";
  data: { skillId: string };
}
// 复活倒计时清零
interface PlayerReviveReadyEvent extends EventObject {
  type: "revive_ready";
  data: { skillId: string };
}
// 技能动作结束
interface PlayerSkillAnimationEndEvent extends EventObject {
  type: "skill_animation_end";
  data: { skillId: string };
}
// 判断可用性
interface PlayerCheckAvailabilityEvent extends EventObject {
  type: "check_availability";
  data: { skillId: string };
}
type PlayerEventType =
  | MemberEventType
  | PlayerSkillPressEvent
  | PlayerCastEndEvent
  | PlayerControlledEvent
  | PlayerChargeEndEvent
  | PlayerHpZeroEvent
  | PlayerControlEndEvent
  | PlayerReviveReadyEvent
  | PlayerSkillAnimationEndEvent
  | PlayerCheckAvailabilityEvent;

// ============================== Player类 ==============================

export type PlayerAttrType = ExtractAttrPaths<ReturnType<typeof PlayerAttrSchema>>;

export const playerStateMachine = (
  member: Member<PlayerAttrType>,
): MemberStateMachine<PlayerAttrType, PlayerEventType> => {
  const machineId = member.id;
  return setup({
    types: {
      context: {} as Member<PlayerAttrType>,
      events: {} as PlayerEventType,
      output: {} as Member<PlayerAttrType>,
    },
    actions: {
      // 根据角色配置初始化玩家状态
      initializePlayerState: assign({
        rs: ({ context }) => context.rs,
        engine: ({ context }) => context.engine,
        id: ({ context }) => context.id,
        campId: ({ context }) => context.campId,
        teamId: ({ context }) => context.teamId,
        targetId: ({ context }) => context.targetId,
        isAlive: true,
      }),

      // 向渲染层发送 spawn 指令（副作用）
      spawnRenderEntity: ({ context }) => {
        try {
          // 通过引擎消息通道发送渲染命令（走 Simulation.worker 的 MessageChannel）
          const engine: any = context.engine as any;
          const memberId = context.id;
          const name = context.name;
          const spawnCmd = {
            type: "render:cmd" as const,
            cmd: {
              type: "spawn" as const,
              entityId: memberId,
              name,
              position: { x: 0, y: 0, z: 0 },
              seq: 0,
              ts: Date.now(),
            },
          };
          // 引擎统一出口：借用现有系统消息发送工具（engine 暴露内部端口发送方法）
          if (engine?.postRenderMessage) {
            engine.postRenderMessage(spawnCmd);
          } else if (typeof (engine as any)?.getMessagePort === "function") {
            // 兜底：如果引擎暴露了 messagePort 获取方法
            const port: MessagePort | undefined = (engine as any).getMessagePort?.();
            port?.postMessage(spawnCmd);
          } else {
            // 最简单 fallback：直接挂到 window 入口（主线程会转发到控制器）
            (globalThis as any).__SIM_RENDER__?.(spawnCmd);
          }
        } catch (e) {
          console.warn("spawnRenderEntity 发送失败", e);
        }
      },

      // 技能相关事件
      onSkillStart: ({ context, event }) => {
        console.log(`🎮 [${context.name}] 技能开始事件`, event);
        const e = event as PlayerSkillPressEvent;
        const skillId = e.data.skillId;
        const currentFrame = context.engine.getFrameLoop().getFrameNumber();
        const executor = context.engine.getFrameLoop().getEventExecutor();

        const skill = context.data.player?.character?.skills?.find((s) => s.id === skillId);
        if (!skill) {
          console.error(`🎮 [${context.name}] 技能不存在: ${skillId}`);
          return;
        }

        const effect = skill.template?.effects.find((e) =>
          executor.executeExpression(e.cost, {
            currentFrame,
            caster: context.id,
            skill: { id: skillId },
          }),
        );
        if (!effect) {
          console.error(`🎮 [${context.name}] 技能效果不存在: ${skillId}`);
          return;
        }
      },

      onCastStart: ({ context, event }) => {
        const e = event as PlayerSkillPressEvent;
        console.log(`🎮 [${context.name}] 前摇开始事件`, event);
        try {
          const skillId = e.data.skillId;
          const currentFrame = context.engine.getFrameLoop().getFrameNumber();
          const executor = context.engine.getFrameLoop().getEventExecutor();

          const skill = context.data.player?.character?.skills?.find((s) => s.id === skillId);
          if (!skill) {
            console.error(`🎮 [${context.name}] 技能不存在: ${skillId}`);
            return;
          }
          const effect = skill.template?.effects.find((e) =>
            executor.executeExpression(e.cost, {
              currentFrame,
              caster: context.id,
              skill: { id: skillId },
            }),
          );
          if (!effect) {
            console.error(`🎮 [${context.name}] 技能效果不存在: ${skillId}`);
            return;
          }
          // 扣除技能消耗
          let mpCost = 0;
          let hpCost = 0;
          if (typeof effect.cost === "string" && effect.cost.trim()) {
            const res = executor.executeExpression(effect.cost, {
              currentFrame,
              caster: context.id,
              skill: { id: skillId },
            });
            if (res.success && Number.isFinite(res.value)) {
              mpCost = Math.max(0, Math.round(res.value));
            }
          }
          const currentMp = context.rs.getValue("mp.current");
          const newMp = Math.max(0, currentMp - mpCost);
          context.engine.getEventQueue().insert({
            id: `mp_cost_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            executeFrame: currentFrame,
            priority: "high",
            type: "custom",
            payload: { action: "modify_attribute", targetMemberId: context.id, attribute: "mp.current", value: newMp },
          });

          // 计算前摇帧数（默认 100，可表达式）
          let preCastFrames = 100;
          if (typeof effect.startupFrames === "number") preCastFrames = Math.max(0, Math.round(effect.startupFrames));
          if (typeof effect.startupFrames === "string" && effect.startupFrames.trim()) {
            const res = executor.executeExpression(effect.startupFrames, {
              currentFrame,
              caster: context.id,
              skill: { id: skillId },
            });
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

      onCastEnd: ({ context, event }) => {
        console.log(`🎮 [${context.name}] 前摇结束事件`, event);
      },

      onSkillEffect: ({ context, event }) => {
        console.log(`🎮 [${context.name}] 技能效果事件`, event);
        try {
          const data = event?.data || {};
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

      onSkillAnimationEnd: ({ context, event }) => {
        console.log(`🎮 [${context.name}] 技能动画结束事件`, event);
      },

      // 退出移动时调度一次 stop_move（保证状态回到 idle）
      scheduleStopMove: ({ context, event }) => {
        try {
          const currentFrame = context.engine.getFrameLoop().getFrameNumber();
          const pos = event?.data?.position;
          context.engine.getEventQueue().insert({
            id: `fsm_stop_move_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            executeFrame: currentFrame + 1,
            priority: "high",
            type: "member_fsm_event",
            payload: { targetMemberId: context.id, fsmEventType: "stop_move", data: { position: pos } },
            source: "player_fsm",
          });
        } catch {}
      },

      onChargeStart: ({ context, event }) => {
        console.log(`🎮 [${context.name}] 开始蓄力事件`, event);
        try {
          const data = event?.data || {};
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
            });
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

      onChargeEnd: ({ context, event }) => {
        console.log(`🎮 [${context.name}] 蓄力结束事件`, event);
      },

      // 处理死亡
      handleDeath: assign({
        isAlive: false,
      }),

      // 重置HP/MP并清除状态效果
      resetHpMpAndStatus: ({ context, event }) => {
        console.log(`🎮 [${context.name}] 重置HP/MP并清除状态效果`);
        context.rs.addModifier("hp.current", ModifierType.BASE_VALUE, context.rs.getValue("hp.max"), {
          id: "revive",
          name: "系统重置",
          type: "system",
        });
        context.rs.addModifier("mp.current", ModifierType.BASE_VALUE, context.rs.getValue("mp.max"), {
          id: "revive",
          name: "系统重置",
          type: "system",
        });
        assign({
          isAlive: true,
        });
      },

      // 记录事件
      logEvent: ({ context, event }) => {
        console.log(`🎮 [${context.name}] 的logEvent事件: ${event.type}`, event);
      },

      // 处理自定义事件（精简架构：FSM转换事件到EventQueue，保持统一执行）
      processCustomEvent: ({ context, event }) => {
        console.log(`🔄 [${context.name}] FSM转换自定义事件到执行队列:`, event.data);

        try {
          // FSM负责事件转换，不直接执行业务逻辑
          const gameEvent = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
            type: "custom" as const,
            priority: "normal" as const,
            executeFrame: context.engine.getFrameLoop().getFrameNumber() + 1, // 下一帧执行
            payload: {
              targetMemberId: context.id,
              memberType: context.type,
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
          console.log(`✅ [${context.name}] 自定义事件已转换并加入执行队列`);
        } catch (error) {
          console.error(`❌ [${context.name}] FSM事件转换失败:`, error);
        }
      },
    },
    guards: {
      // 检查是否有后续连击步骤
      hasNextCombo: ({ context, event }) => {
        console.log(`🎮 检查[${context.name}] 是否有后续连击步骤`);
        // 检查是否有后续连击步骤
        // 可以根据实际连击逻辑实现
        return false; // 暂时返回false，可以根据实际逻辑调整
      },

      // 检查当前技能是否有蓄力动作（正向 guard）
      hasChargeAction: ({ context, event }) => {
        console.log(`🎮 检查[${context.name}] 技能是否有蓄力动作`);
        // TODO: 基于技能模板判断是否需要蓄力
        return false; // 先保留占位实现
      },

      // 技能可用性检查（汇总冷却/资源/状态）
      isSkillAvailable: ({ context, event }) => {
        console.log(`🎮 检查[${context.name}] 技能是否可用`);
        // TODO: 汇总沉默/冷却/MP/HP等检查
        return context.isAlive;
      },

      // 检查玩家是否死亡
      isDead: ({ context }) => {
        const isDead = context.rs.getValue("hp.current") <= 0;
        console.log(`🎮 检查[${context.name}] 是否死亡: ${isDead}`);
        return isDead;
      },

      // 检查玩家是否存活
      isAlive: ({ context }) => {
        const isAlive = context.rs.getValue("hp.current") > 0;
        console.log(`🎮 检查[${context.name}] 是否存活: ${isAlive}`);
        return isAlive;
      },
    },
  }).createMachine({
    id: machineId,
    context: member,
    initial: "alive",
    entry: [{ type: "initializePlayerState" }, { type: "spawnRenderEntity" }],
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
                  使用技能: [
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
                  stop_move: { target: "idle" },
                },
                exit: { type: "scheduleStopMove" },
              },
              skill_casting: {
                initial: "skill_init",
                states: {
                  skill_init: {
                    on: {
                      使用技能: [
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
};
