import { assign, enqueueActions, EventObject, setup } from "xstate";
import { createId } from "@paralleldrive/cuid2";
import { MemberEventType, MemberSerializeData, MemberStateMachine } from "../Member";
import { Player, PlayerAttrType } from "./Player";
import { ModifierType } from "../../dataSys/ReactiveSystem";
import { SkillEffectWithRelations } from "@db/repositories/skillEffect";
import { CharacterSkillWithRelations } from "@db/repositories/characterSkill";

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

export const playerStateMachine = (player: Player) => {
  const machineId = player.id;

  // 扩展Player的context，添加状态机需要的状态
  interface PlayerStateContext extends Player {
    /** 技能列表 */
    skillList: CharacterSkillWithRelations[];
    /** 技能冷却 */
    skillCooldowns: number[];
    /** 正在施放的技能效果 */
    currentSkillEffect: SkillEffectWithRelations | null;
    /** 正在施放的技能序号 */
    currentSkillIndex: number;
    /** 技能开始帧 */
    skillStartFrame: number;
    /** 技能结束帧 */
    skillEndFrame: number;
  }

  const machine = setup({
    types: {
      context: {} as PlayerStateContext,
      events: {} as PlayerEventType,
      output: {} as Player,
    },
    actions: {
      根据角色配置生成初始状态: function ({ context, event }) {
        console.log(`👤 [${context.name}] 根据角色配置生成初始状态`, event);
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
        console.log(`👤 [${context.name}] 休息动画`, event);
      },
      前摇动画: function ({ context, event }) {
        console.log(`👤 [${context.name}] 前摇动画`, event);
      },
      扣除技能消耗: enqueueActions(({ context, event, enqueue }) => {
        const e = event as 使用技能;
        const skillId = e.data.skillId;
        const currentFrame = context.engine.getFrameLoop().getFrameNumber();

        const skill = context.skillList.find((s) => s.id === skillId);
        if (!skill) {
          console.error(`🎮 [${context.name}] 技能不存在: ${skillId}`);
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
          console.error(`🎮 [${context.name}] 技能效果不存在: ${skillId}`);
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

        context.rs.addModifiers([
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
          `👤 [${context.name}] HP: ${context.rs.getValue("hp.current")}, MP: ${context.rs.getValue("mp.current")}`,
        );
      }),

      写入前摇结束通知事件: function ({ context, event }) {
        console.log("🎮 写入前摇结束通知事件", event);

        const e = event as 收到前摇结束通知;
        const skillId = e.data.skillId;
        const currentFrame = context.engine.getFrameLoop().getFrameNumber();

        const skill = context.skillList.find((s) => s.id === skillId);
        if (!skill) {
          throw new Error(`🎮 [${context.name}] 技能不存在: ${skillId}`);
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
          throw new Error(`🎮 [${context.name}] 技能效果不存在: ${skillId}`);
        }

        const motionFixed = Math.floor(
          context.engine.evaluateExpression(effect.motionFixed ?? "0", {
            currentFrame,
            casterId: context.id,
            skillLv: skill?.lv ?? 0,
          }),
        );
        const motionModified = Math.floor(
          context.engine.evaluateExpression(effect.motionModified ?? "0", {
            currentFrame,
            casterId: context.id,
            skillLv: skill?.lv ?? 0,
          }),
        );
        const mspd = Math.min(0.5, Math.floor(context.rs.getValue("mspd")));
        console.log(`👤 [${context.name}] 固定帧：`, motionFixed);
        console.log(`👤 [${context.name}] 可加速帧：`, motionModified);
        console.log(`👤 [${context.name}] 当前行动速度：`, mspd);

        const totalMotion = motionFixed + motionModified * (1 - mspd);
        console.log(`👤 [${context.name}] 总帧数：`, totalMotion);

        const startupRatio = context.engine.evaluateExpression(
          effect?.startupFrames ?? "throw new Error('前摇时长表达式不存在')",
          {
            currentFrame,
            casterId: context.id,
            skillLv: skill?.lv ?? 0,
          },
        );
        console.log(`👤 [${context.name}] 前摇比例：`, startupRatio);
        const startupFrames = Math.floor(startupRatio * totalMotion);
        console.log(`👤 [${context.name}] 前摇帧数：`, startupFrames);

        // 计算前摇结束的目标帧
        const targetFrame = currentFrame + startupFrames;

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
            skillId: skillId, // 技能ID
            source: "skill_front_swing", // 事件来源
          },
        });

        console.log(
          `👤 [${context.name}] 前摇开始，${startupFrames}帧后结束 (当前帧: ${currentFrame}, 目标帧: ${targetFrame})`,
        );
      },
      蓄力动画: function ({ context, event }) {
        console.log(`👤 [${context.name}] 蓄力动画`, event);
      },
      写入蓄力结束通知事件: function ({ context, event }) {
        console.log(`👤 [${context.name}] 写入蓄力结束通知事件`, event);
      },
      后摇动画: function ({ context, event }) {
        console.log(`👤 [${context.name}] 后摇动画`, event);
      },
      写入后摇结束通知事件: function ({ context, event }) {
        console.log(`👤 [${context.name}] 写入后摇结束通知事件`, event);
      },
      在当前帧写入技能效果事件: function ({ context, event }) {
        console.log(`👤 [${context.name}] 在当前帧写入技能效果事件`, event);
      },
      重置角色状态: function ({ context, event }) {
        console.log(`👤 [${context.name}] 重置角色状态`, event);
      },
    },
    guards: {
      没有可用效果: function ({ context, event }) {
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
        // 测试内容
        context.engine.evaluateExpression(
          `var _E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97, _E6_9C_89_E6_95_88_E6_94_BB_E5_87_BB_E5_8A_9B, _E5_AE_9E_E9_99_85_E5_91_BD_E4_B8_AD_E7_8E_87, _E6_8A_80_E8_83_BD_E5_B8_B8_E6_95_B0, _E6_8A_80_E8_83_BD_E5_80_8D_E7_8E_87;

// 计算造成的伤害
function damage() {
_E6_9C_89_E6_95_88_E6_94_BB_E5_87_BB_E5_8A_9B = (self.rs.getValue("lv") + self.rs.getValue("lv")) * (1 - target.rs.getValue("red.p")) - target.rs.getValue("def.p") * (1 - self.rs.getValue("pie.p"));
_E6_8A_80_E8_83_BD_E5_B8_B8_E6_95_B0 = 100;
_E6_8A_80_E8_83_BD_E5_80_8D_E7_8E_87 = 1.5;
return (_E6_9C_89_E6_95_88_E6_94_BB_E5_87_BB_E5_8A_9B + _E6_8A_80_E8_83_BD_E5_B8_B8_E6_95_B0) * _E6_8A_80_E8_83_BD_E5_80_8D_E7_8E_87;
}

function mathRandomInt(a, b) {
if (a > b) {
  // Swap a and b to ensure a is smaller.
  var c = a;
  a = b;
  b = c;
}
return Math.floor(Math.random() * (b - a + 1) + a);
}

// 判断是否命中
function isHit() {
_E5_AE_9E_E9_99_85_E5_91_BD_E4_B8_AD_E7_8E_87 = 100 + ((self.rs.getValue("accuracy") - target.rs.getValue("avoid")) + _E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97) / 3;
console.log("命中率",_E5_AE_9E_E9_99_85_E5_91_BD_E4_B8_AD_E7_8E_87);
return mathRandomInt(1, 100) < _E5_AE_9E_E9_99_85_E5_91_BD_E4_B8_AD_E7_8E_87;
}

// 描述该功能...
function main() {
if (self.rs.getValue("mp.current") > _E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97) {
  console.log("技能消耗",_E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97);
  self.rs.addModifier("mp.current", 3, -_E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97, { id: "blockly_subtract", name: "积木减少", type: "system" });
  console.log("技能消耗后当前MP",self.rs.getValue("mp.current"))
  if (isHit() == true) {
    console.log("命中成功, 伤害:",damage())
    console.log("命中前血量:",target.rs.getValue("hp.current"))
    target.rs.addModifier("hp.current", 3, -(damage()), { id: "blockly_subtract", name: "积木减少", type: "system" });
    console.log("命中后血量:",target.rs.getValue("hp.current"))
  } else {
    console.log("miss")
  }
}
}


_E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97 = 100;


main();`,
          {
            currentFrame,
            casterId: context.id,
            skillLv: skill?.lv ?? 0,
            targetId: "defaultMember2Id",
          },
        );
        return false;
      },
      技能未冷却: function ({ context, event }) {
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
        console.log(`该技能未冷却，剩余冷却时间：${res}`);
        return true;
      },
      不满足施法消耗: function ({ context, event }) {
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
        if (hpCost > context.rs.getValue("hp.current") || mpCost > context.rs.getValue("mp.current")) {
          console.log(`- 该技能不满足施法消耗，HP:${hpCost} MP:${mpCost}`);
          // 这里需要撤回RS的修改
          return true;
        }
        console.log(`- 该技能满足施法消耗，HP:${hpCost} MP:${mpCost}`);
        return false;
      },
      有蓄力动作: function ({ context, event }) {
        console.log(`👤 [${context.name}] 判断技能是否有蓄力动作`, event);

        const effect = context.currentSkillEffect;
        if (!effect) {
          console.error(`👤 [${context.name}] 技能效果不存在`);
          return false;
        }

        const currentFrame = context.engine.getFrameLoop().getFrameNumber();
        
        // 蓄力动作相关属性（假设使用chargeFixed和chargeModified）
        const reservoirFixed = context.engine.evaluateExpression(effect.reservoirFixed ?? "0", {
          currentFrame,
          casterId: context.id,
        });
        const reservoirModified = context.engine.evaluateExpression(effect.reservoirModified ?? "0", {
          currentFrame,
          casterId: context.id,
        });

        // 咏唱动作相关属性
        const chantingFixed = context.engine.evaluateExpression(effect.chantingFixed ?? "0", {
          currentFrame,
          casterId: context.id,
        });
        const chantingModified = context.engine.evaluateExpression(effect.chantingModified ?? "0", {
          currentFrame,
          casterId: context.id,
        });

        const chargeType = reservoirFixed + reservoirModified > 0 ? "有蓄力动作" : "没有蓄力动作";
        const chantingType = chantingFixed + chantingModified > 0 ? "有咏唱动作" : "没有咏唱动作";

        switch ([chargeType, chantingType]) {
          case ["有蓄力动作", "有咏唱动作"]:
            console.log(`👤 [${context.name}] 技能有蓄力动作和咏唱动作`);
            return true;
          case ["有蓄力动作", "没有咏唱动作"]:
            console.log(`👤 [${context.name}] 技能有蓄力动作，没有咏唱动作`);
            return true;
          case ["没有蓄力动作", "有咏唱动作"]:
            console.log(`👤 [${context.name}] 技能没有蓄力动作，有咏唱动作`);
            return true;
          case ["没有蓄力动作", "没有咏唱动作"]:
            console.log(`👤 [${context.name}] 技能没有蓄力动作，没有咏唱动作`);
            return false;
          default:
            console.log(`👤 [${context.name}] 技能没有蓄力动作和没有咏唱动作`);
            return false;
        }
      },
      没有后续技能: function ({ context, event }) {
        console.log(`👤 [${context.name}] 判断技能是否没有后续技能`, event);
        return true;
      },
    },
  }).createMachine({
    context: {
      ...player,
      skillList: player.data.player?.character?.skills ?? [],
      skillCooldowns: player.data.player?.character?.skills?.map((s) => 0) ?? [],
      currentSkillEffect: null,
      currentSkillIndex: 0,
      skillStartFrame: 0,
      skillEndFrame: 0,
      serialize: () => ({}) as MemberSerializeData, // 状态机不应该处理此方法，只是为了通过类型检查
    },
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
