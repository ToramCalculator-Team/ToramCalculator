import { assign, EventObject, setup } from "xstate";
import { MemberEventType, MemberStateMachine } from "../Member";
import { Player, PlayerAttrType } from "./Player";

/**
 * Player特有的事件类型
 * 扩展MemberEventType，包含Player特有的状态机事件
 */
// 技能按下
interface 受到控制 extends EventObject {
  type: "受到控制";
  data: { origin: string; skillId: string };
}
interface 受到致命伤害 extends EventObject {
  type: "受到致命伤害";
  data: { origin: string; skillId: string };
}
interface 控制时间结束 extends EventObject {
  type: "控制时间结束";
}
interface 复活倒计时清零 extends EventObject {
  type: "复活倒计时清零";
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
interface 收到后摇结束通知 extends EventObject {
  type: "收到后摇结束通知";
  data: { skillId: string };
}
interface 移动 extends EventObject {
  type: "移动";
}
interface 停止 extends EventObject {
  type: "停止";
}
type PlayerEventType =
  | MemberEventType
  | 停止
  | 移动
  | 使用技能
  | 受到控制
  | 受到致命伤害
  | 控制时间结束
  | 复活倒计时清零
  | 收到前摇结束通知
  | 收到蓄力结束通知
  | 收到后摇结束通知;

export const playerStateMachine = (
  member: Player,
) => {
  const machineId = member.id;
  const machine = setup({
    types: {
      context: {} as Player,
      events: {} as PlayerEventType,
      output: {} as Player,
    },
    actions: {
      根据角色配置生成初始状态: function ({ context, event }) {
        console.log("根据角色配置生成初始状态", event);
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
      },
      休息动画: function ({ context, event }) {
        console.log("休息动画", event);
      },
      前摇动画: function ({ context, event }) {
        console.log("前摇动画", event);
      },
      扣除技能消耗: function ({ context, event }) {
        console.log("扣除技能消耗", event);
      },
      写入前摇结束通知事件: function ({ context, event }) {
        console.log("写入前摇结束通知事件", event);
      },
      蓄力动画: function ({ context, event }) {
        console.log("蓄力动画", event);
      },
      写入蓄力结束通知事件: function ({ context, event }) {
        console.log("写入蓄力结束通知事件", event);
      },
      后摇动画: function ({ context, event }) {
        console.log("后摇动画", event);
      },
      写入后摇结束通知事件: function ({ context, event }) {
        console.log("写入后摇结束通知事件", event);
      },
      在当前帧写入技能效果事件: function ({ context, event }) {
        console.log("在当前帧写入技能效果事件", event);
      },
      重置角色状态: function ({ context, event }) {
        console.log("重置角色状态", event);
      },
    },
    guards: {
      没有可用效果: function ({ context, event }) {
        const e = event as 使用技能;
        const skillId = e.data.skillId;
        const currentFrame = context.engine.getFrameLoop().getFrameNumber();
        const executor = context.engine.getFrameLoop().getEventExecutor();

        const skill = context.skills?.find((s) => s.id === skillId);
        if (!skill) {
          console.error(`🎮 [${context.name}] 技能不存在: ${skillId}`);
          return true;
        }
        const effect = skill.template?.effects.find((e) =>
          executor.executeExpression(e.condition, {
            currentFrame,
            casterId: context.id,
            skillLv: skill?.lv ?? 0,
          }),
        );
        if (!effect) {
          console.error(`🎮 [${context.name}] 技能效果不存在: ${skillId}`);
          return true;
        }
        console.log(`🎮 [${context.name}] 的技能 ${skill.template?.name} 可用`);
        assign({
          skillEffect: effect,
        });
        return false;
      },
      技能未冷却: function ({ context, event }) {
        const e = event as 使用技能;
        const skillId = e.data.skillId;
        const res = context.skillCooldowns.get(skillId);
        if (res == undefined) {
          console.log(`- 该技能不存在冷却时间`);
          return false;
        }
        if (res <= 0) {
          console.log(`- 该技能处于冷却状态`);
          return false;
        }
        console.log(`该技能未冷却，剩余冷却时间：${res}`);
        return true;
      },
      不满足施法消耗: function ({ context, event }) {
        const currentFrame = context.engine.getFrameLoop().getFrameNumber();
        const executor = context.engine.getFrameLoop().getEventExecutor();
        const e = event as 使用技能;
        const skillId = e.data.skillId;
        const skill = context.skills?.find((s) => s.id === skillId);
        const hpCost = executor.executeExpression(context.skillEffect?.hpCost ?? "throw new Error('技能消耗表达式不存在')", {
          currentFrame,
          casterId: context.id,
          skillLv: skill?.lv ?? 0,
        });
        const mpCost = executor.executeExpression(context.skillEffect?.mpCost ?? "throw new Error('技能消耗表达式不存在')", {
          currentFrame,
          casterId: context.id,
          skillLv: skill?.lv ?? 0,
        });
        if(hpCost.value > context.rs.getValue("hp.current") || mpCost.value > context.rs.getValue("mp.current")) {
          console.log(`- 该技能不满足施法消耗，HP:${hpCost.value} MP:${mpCost.value}`);
          // 这里需要撤回RS的修改
          return true;
        }
        console.log(`- 该技能满足施法消耗，HP:${hpCost.value} MP:${mpCost.value}`);
        return false;
      },
      有蓄力动作: function ({ context, event }) {
        console.log("判断技能是否有蓄力动作", event);
        return true;
      },
      没有后续技能: function ({ context, event }) {
        console.log("判断技能是否没有后续技能", event);
        return true;
      },
    },
  }).createMachine({
    context: member,
    id: machineId,
    initial: "存活",
    entry: {
      type: "根据角色配置生成初始状态",
    },
    states: {
      存活: {
        initial: "可操作状态",
        on: {
          受到致命伤害: {
            target: "死亡",
          },
        },
        description: "玩家存活状态，此时可操作且可影响上下文",
        states: {
          可操作状态: {
            initial: "空闲状态",
            on: {
              受到控制: {
                target: "控制类异常状态",
              },
            },
            description: "可响应输入操作",
            states: {
              空闲状态: {
                on: {
                  移动: {
                    target: "移动中",
                  },
                  使用技能: {
                    target: "判断技能可用性",
                  },
                },
                entry: {
                  type: "休息动画",
                },
              },
              移动中: {
                on: {
                  停止: {
                    target: "空闲状态",
                  },
                },
              },
              判断技能可用性: {
                always: [
                  {
                    target: `#${machineId}.存活.控制类异常状态`,
                    guard: {
                      type: "没有可用效果",
                    },
                  },
                  {
                    target: `#${machineId}.存活.控制类异常状态`,
                    guard: {
                      type: "技能未冷却",
                    },
                  },
                  {
                    target: `#${machineId}.存活.控制类异常状态`,
                    guard: {
                      type: "不满足施法消耗",
                    },
                  },
                  {
                    target: "发动技能中",
                  },
                ],
              },
              发动技能中: {
                initial: "前摇",
                states: {
                  前摇: {
                    on: {
                      收到前摇结束通知: [
                        {
                          target: "蓄力动作",
                          guard: {
                            type: "有蓄力动作",
                          },
                        },
                        {
                          target: "后摇",
                        },
                      ],
                    },
                    entry: [
                      {
                        type: "前摇动画",
                      },
                      {
                        type: "扣除技能消耗",
                      },
                      {
                        type: "写入前摇结束通知事件",
                      },
                    ],
                  },
                  蓄力动作: {
                    on: {
                      收到蓄力结束通知: {
                        target: "后摇",
                      },
                    },
                    entry: [
                      {
                        type: "蓄力动画",
                      },
                      {
                        type: "写入蓄力结束通知事件",
                      },
                    ],
                  },
                  后摇: {
                    on: {
                      收到后摇结束通知: [
                        {
                          target: `#${machineId}.存活.可操作状态.空闲状态`,
                          guard: {
                            type: "没有后续技能",
                          },
                        },
                        {
                          target: `#${machineId}.存活.可操作状态.判断技能可用性`,
                        },
                      ],
                    },
                    entry: [
                      {
                        type: "后摇动画",
                      },
                      {
                        type: "写入后摇结束通知事件",
                      },
                      {
                        type: "在当前帧写入技能效果事件",
                      },
                    ],
                  },
                },
              },
            },
          },
          控制类异常状态: {
            on: {
              控制时间结束: {
                target: `#${machineId}.存活.可操作状态.空闲状态`,
              },
            },
          },
        },
      },
      死亡: {
        on: {
          复活倒计时清零: {
            target: `#${machineId}.存活.可操作状态`,
            actions: {
              type: "重置角色状态",
            },
          },
        },
        description: "不可操作，中断当前行为，且移出上下文",
      },
    },
  });
  return machine;
};
