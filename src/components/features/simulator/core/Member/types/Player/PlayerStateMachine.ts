import { assign, EventObject, setup, sendTo, raise } from "xstate";
import { MemberEventType } from "../../runtime/StateMachine/types";
import { Player, PlayerAttrType } from "./Player";
import type { MemberStateContext, MemberStateMachine } from "../../runtime/StateMachine/types";
import { State } from "mistreevous";
import { defaultBt } from "../../runtime/BehaviourTree/defaultBt";

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
  data: {
    origin: string;
    skillId: string;
    damageRequest?: {
      sourceId: string;
      targetId: string;
      skillId: string;
      damageType: "physical" | "magic";
      canBeDodged: boolean;
      canBeGuarded: boolean;
      damageFormula: string;
      extraVars?: Record<string, any>;
      sourceSnapshot?: any;
    };
  };
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

// 定义 PlayerStateContext 类型（提前声明）
export interface PlayerStateContext extends MemberStateContext {}

export const playerStateMachine = (player: Player): MemberStateMachine<PlayerEventType, PlayerStateContext> => {
  const machineId = player.id;
  const runtimeContext = player.runtimeContext;

  const machine = setup({
    types: {
      context: {} as PlayerStateContext,
      events: {} as PlayerEventType,
      output: {} as Player,
    },
    actions: {
      根据角色配置生成初始状态: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 根据角色配置生成初始状态`, context);
      },
      更新玩家状态: assign({
        currentFrame: ({ context }) => context.currentFrame + 1,
      }),
      启用站立动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 启用站立动画`, event);
      },
      启用移动动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 启用移动动画`, event);
      },
      显示警告: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 显示警告`, event);
      },
      创建警告结束通知: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 创建警告结束通知`, event);
      },
      添加待处理技能: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 添加待处理技能`, event);
        const e = event as 使用技能;
        const skillId = e.data.skillId;
        const skill = player.activeCharacter.skills?.find((s) => s.id === skillId);
        if (!skill) {
          console.error(`🎮 [${context.owner?.name}] 的当前技能不存在`);
        }
        runtimeContext.currentSkill = skill;
      },
      清空待处理技能: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 清空待处理技能`, event);
        runtimeContext.currentSkill = null;
        // 清理技能级管线覆盖，避免影响后续技能
        // player.pipelineManager?.clearSkillOverrides?.();
        if (runtimeContext.currentSkillTreeId) {
          player.btManager.unregisterSkillBt();
          runtimeContext.currentSkillTreeId = "unknown_skill";
        }
      },
      清理行为树: function ({ context }) {
        player.btManager.clear();
      },
      添加待处理技能效果: function ({ context, event }) {
        const skillEffect = runtimeContext.currentSkill?.template?.effects.find((e) =>
          player.engine.evaluateExpression(e.condition, {
            currentFrame: runtimeContext.currentFrame,
            casterId: player.id,
            skillLv: runtimeContext.currentSkill?.lv ?? 0,
          }),
        );
        console.log(`👤 [${context.owner?.name}] 添加待处理技能效果`, skillEffect);
        runtimeContext.currentSkillEffect = skillEffect;
      },
      执行技能: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 执行技能`, runtimeContext.currentSkill?.template?.name);

        const skillEffect = runtimeContext.currentSkillEffect;
        if (!skillEffect) {
          console.error(`🎮 [${context.owner?.name}] 当前技能效果不存在`);
          player.actor.send({ type: "技能执行完成" });
          return;
        }

        // 提取行为树定义
        const treeDefinition = defaultBt.tree;
        if (typeof treeDefinition !== "string" && typeof treeDefinition !== "object") {
          console.error(`🎮 [${context.owner?.name}] 技能逻辑格式无效`, defaultBt);
          player.actor.send({ type: "技能执行完成" });
          return;
        }

        // 提取并编译函数定义（如果有）
        const functionCodeMap = defaultBt.functions;
        const compiledFunctions: Record<string, any> = {};

        for (const [name, code] of Object.entries(functionCodeMap)) {
          if (typeof code === "string") {
            // 编译函数代码字符串为函数对象
            // 函数代码应该是完整的函数体，例如：
            // "return State.SUCCEEDED;" 或
            // "(agent, ...args) => { return State.SUCCEEDED; }"
            try {
              // 使用 Function 构造函数编译函数
              // AgentFunction 类型：function(this: Agent, ...args: FunctionArg[]): ActionResult | boolean
              // eslint-disable-next-line no-new-func
              const func = new Function("State", "return " + code)(State);
              if (typeof func === "function") {
                compiledFunctions[name] = func;
              } else {
                console.error(`🎮 [${context.owner?.name}] 函数 ${name} 编译结果不是函数类型`);
              }
            } catch (error) {
              console.error(`🎮 [${context.owner?.name}] 编译函数 ${name} 失败:`, error);
            }
          } else if (typeof code === "function") {
            // 如果已经是函数对象，直接使用
            compiledFunctions[name] = code;
          }
        }

        // 注册行为树和函数
        runtimeContext.currentSkillLogic =
          typeof treeDefinition === "string" ? treeDefinition : JSON.stringify(treeDefinition);
        const treeData = player.btManager.registerSkillBt(
          treeDefinition,
          Object.keys(compiledFunctions).length > 0 ? compiledFunctions : undefined,
        );
        if (!treeData) {
          console.error(`🎮 [${context.owner?.name}] 技能逻辑不是有效的行为树 TreeData，已跳过执行`, treeDefinition);
          player.actor.send({ type: "技能执行完成" });
          return;
        }
      },
      重置控制抵抗时间: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 重置控制抵抗时间`, event);
      },
      中断当前行为: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 中断当前行为`, event);
      },
      启动受控动画: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 启动受控动画`, event);
      },
      重置到复活状态: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 重置到复活状态`, event);
      },
      发送命中判定事件给自己: function ({ context, event }) {
        // 不使用 raise(...)，直接向自身发送事件（命令式），避免 XState dev build 警告
        player.actor.send({ type: "进行命中判定" });
      },
      反馈命中结果给施法者: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 反馈命中结果给施法者`, event);
      },
      发送控制判定事件给自己: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 发送控制判定事件给自己`, event);
        // 不要在自定义 action 中调用 raise(...)（非命令式），这里直接向自身发送事件即可
        player.actor.send({ type: "进行控制判定" });
      },
      命中计算管线: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 命中计算管线`, event);
      },
      根据命中结果进行下一步: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 根据命中结果进行下一步`, event);
        const result = runtimeContext.lastHitResult;

        if (!result) {
          console.warn(`⚠️ [${context.owner?.name}] 没有命中结果，终止后续流程`);
          return;
        }

        // 未命中或被闪躲：不再进入控制/伤害流程
        if (!result.hit || result.dodge) {
          console.log(`👤 [${context.owner?.name}] 本次攻击未命中或被闪躲，hit=${result.hit}, dodge=${result.dodge}`);
          return;
        }

        // 命中后再进入控制判定
        player.actor.send({ type: "进行控制判定" });
      },
      控制判定管线: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 控制判定管线`, event);
      },
      反馈控制结果给施法者: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 反馈控制结果给施法者`, event);
      },
      发送伤害计算事件给自己: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 发送伤害计算事件给自己`, event);
        player.actor.send({ type: "进行伤害计算" });
      },
      伤害计算管线: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 伤害计算管线`, event);
      },
      反馈伤害结果给施法者: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 反馈伤害结果给施法者`, event);
      },
      发送属性修改事件给自己: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 发送属性修改事件给自己`, event);
        const currentHp = player.statContainer.getValue("hp.current");
        player.actor.send({ type: "修改属性", data: { attr: "hp.current", value: currentHp } });
      },
      发送buff修改事件给自己: function ({ context, event }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 发送buff修改事件给自己`, event);
      },
      记录伤害请求: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 记录伤害请求`, event);
        const e = event as 受到攻击;
        const damageRequest = e.data?.damageRequest;
        if (damageRequest) {
          runtimeContext.currentDamageRequest = damageRequest;
        } else {
          runtimeContext.currentDamageRequest = undefined;
        }
      },
      修改目标Id: function ({ context, event }, params: { targetId: string }) {
        // Add your action code here
        // ...
        console.log(`👤 [${context.owner?.name}] 修改目标Id`, event);
        context.targetId = params.targetId;
      },
      logEvent: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 日志事件`, event);
      },
    },
    guards: {
      存在蓄力阶段: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 判断技能是否有蓄力阶段`, event);

        const effect = runtimeContext.currentSkillEffect;
        if (!effect) {
          console.error(`👤 [${context.owner?.name}] 技能效果不存在`);
          return false;
        }

        const currentFrame = player.engine.getCurrentFrame();

        // 蓄力阶段相关属性（假设使用chargeFixed和chargeModified）
        const reservoirFixed = player.engine.evaluateExpression(effect.reservoirFixed ?? "0", {
          currentFrame,
          casterId: player.id,
        });
        const reservoirModified = player.engine.evaluateExpression(effect.reservoirModified ?? "0", {
          currentFrame,
          casterId: player.id,
        });
        console.log(reservoirFixed + reservoirModified > 0 ? "有蓄力阶段" : "没有蓄力阶段");
        return reservoirFixed + reservoirModified > 0;
      },
      存在咏唱阶段: function ({ context, event }) {
        console.log(`👤 [${context.owner?.name}] 判断技能是否有咏唱阶段`, event);
        const effect = runtimeContext.currentSkillEffect;
        if (!effect) {
          console.error(`👤 [${context.owner?.name}] 技能效果不存在`);
          return false;
        }
        const currentFrame = player.engine.getCurrentFrame();
        const chantingFixed = player.engine.evaluateExpression(effect.chantingFixed ?? "0", {
          currentFrame,
          casterId: player.id,
        });
        const chantingModified = player.engine.evaluateExpression(effect.chantingModified ?? "0", {
          currentFrame,
          casterId: player.id,
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
        console.log(`👤 [${context.owner?.name}] 判断技能是否有可用效果`, event);
        const e = event as 使用技能;
        const skillId = e.data.skillId;
        const currentFrame = player.engine.getCurrentFrame();
        const skill = runtimeContext.currentSkill;
        if (!skill) {
          console.error(`🎮 [${context.owner?.name}] 技能不存在: ${skillId}`);
          return true;
        }
        const effect = skill.template?.effects.find((e) => {
          const result = player.engine.evaluateExpression(e.condition, {
            currentFrame,
            casterId: player.id,
            skillLv: skill?.lv ?? 0,
          });
          console.log(`🔍 技能效果条件检查: ${e.condition} = ${result} (类型: ${typeof result})`);
          return !!result; // 明确返回布尔值进行比较
        });
        if (!effect) {
          console.error(`🎮 [${context.owner?.name}] 技能效果不存在: ${skillId}`);
          return true;
        }
        console.log(`🎮 [${context.owner?.name}] 的技能 ${skill.template?.name} 可用`);
        return false;
      },
      还未冷却: function ({ context, event }) {
        const e = event as 使用技能;
        const res = runtimeContext.skillCooldowns?.[runtimeContext.currentSkillIndex ?? 0];
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
        const currentFrame = player.engine.getCurrentFrame();

        const skill = runtimeContext.currentSkill;
        if (!skill) {
          console.error(`🎮 [${context.owner?.name}] 技能不存在: ${skillId}`);
          return true;
        }
        const effect = skill.template?.effects.find((e) => {
          const result = player.engine.evaluateExpression(e.condition, {
            currentFrame,
            casterId: player.id,
            skillLv: skill?.lv ?? 0,
          });
          console.log(`🔍 技能效果条件检查: ${e.condition} = ${result} (类型: ${typeof result})`);
          return !!result; // 明确返回布尔值进行比较
        });
        if (!effect) {
          console.error(`🎮 [${context.owner?.name}] 技能效果不存在: ${skillId}`);
          return true;
        }
        if (effect.hpCost && effect.mpCost) {
          const hpCost = player.engine.evaluateExpression(effect.hpCost, {
            currentFrame,
            casterId: player.id,
            skillLv: skill?.lv ?? 0,
          });
          const mpCost = player.engine.evaluateExpression(effect.mpCost, {
            currentFrame,
            casterId: player.id,
            skillLv: skill?.lv ?? 0,
          });
          if (
            hpCost > player.statContainer.getValue("hp.current") ||
            mpCost > player.statContainer.getValue("mp.current")
          ) {
            console.log(`- 该技能不满足施法消耗，HP:${hpCost} MP:${mpCost}`);
            // 这里需要撤回RS的修改
            return true;
          }
          console.log(`- 该技能满足施法消耗，HP:${hpCost} MP:${mpCost}`);
        } else {
          console.error(`🎮 [${context.owner?.name}] 技能消耗表达式不存在`);
          return true; // 视为不满足施法条件
        }
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
        const hp = player.statContainer.getValue("hp.current");
        const isAlive = hp > 0;
        context.isAlive = isAlive;
        return isAlive;
      },
    },
  }).createMachine({
    context: {
      targetId: player.id,
      isAlive: true,
      position: player.position,
      createdAtFrame: player.engine.getCurrentFrame(),
      currentFrame: player.engine.getCurrentFrame(),
      statusTags: [],
      owner: player,
    },
    id: machineId,
    initial: "存活",
    on: {
      更新: {
        actions: [
          {
            type: "更新玩家状态",
          },
        ],
      },
    },
    entry: {
      type: "根据角色配置生成初始状态",
    },
    states: {
      存活: {
        initial: "可操作状态",
        on: {
          受到攻击: {
            actions: [
              {
                type: "记录伤害请求",
              },
              {
                type: "发送命中判定事件给自己",
              },
            ],
          },
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
                  执行技能中: {
                    entry: [{ type: "添加待处理技能效果" }, { type: "执行技能" }],
                    on: {
                      技能执行完成: [
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
        entry: {
          type: "清理行为树",
        },
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
