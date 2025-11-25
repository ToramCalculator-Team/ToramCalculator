import { assign, enqueueActions, EventObject, setup } from "xstate";
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
import { PlayerBehaviorContext } from "./PlayerBehaviorContext";
import { Tree, type TreeData } from "~/lib/behavior3/tree";
import skillExecutionTemplate from "./behaviorTree/skillExecutionTemplate.json";

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
  /** 当前执行的技能行为树 */
  skillExecutionTree: Tree<PlayerBehaviorContext, PlayerStateContext> | null;
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
        enqueue.assign({
          skillCooldowns: res.stageOutputs.技能冷却初始化.skillCooldownResult,
        });
        console.log(`👤 [${context.name}] 技能冷却初始化完成`, context.skillCooldowns);
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
      添加待处理技能效果: assign({
        currentSkillEffect: ({ context }) => {
          const skillEffect = context.currentSkill?.template?.effects.find((e) =>
            context.engine.evaluateExpression(e.condition, {
              currentFrame: context.currentFrame,
              casterId: context.id,
              skillLv: context.currentSkill?.lv ?? 0,
            }),
          );
          if (!skillEffect) {
            console.error(`🎮 [${context.name}] 使用的技能${context.currentSkill?.template?.name}没有可用的效果`);
            return null;
          }
          return skillEffect;
        },
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
      初始化技能行为树: async function ({ context, event }) {
        console.log(`👤 [${context.name}] 初始化技能行为树`);

        // 创建行为树上下文
        const behaviorContext = new PlayerBehaviorContext(context);

        // 尝试从 skill_effect.logic 加载技能特定的行为树
        let skillLogicTree: Tree<PlayerBehaviorContext, PlayerStateContext> | null = null;

        if (context.currentSkillEffect?.logic) {
          try {
            // logic 可能是 JSON 对象或字符串
            const logicData =
              typeof context.currentSkillEffect.logic === "string"
                ? JSON.parse(context.currentSkillEffect.logic)
                : context.currentSkillEffect.logic;

            if (logicData && typeof logicData === "object" && logicData.root) {
              // 使用固定的路径标识符，确保缓存键匹配
              const skillLogicPath = "skill_logic";
              const treeDataWithName = {
                ...logicData,
                name: skillLogicPath, // 确保 name 与路径一致
              } as TreeData;
              
              // 加载技能特定的行为树（会缓存到 skillLogicPath 键下）
              await behaviorContext.loadTree(treeDataWithName);
              // 创建 Tree 实例，构造函数会从缓存中获取
              skillLogicTree = new Tree(behaviorContext, context, skillLogicPath);
            }
          } catch (error) {
            console.warn(
              `⚠️ [${context.name}] 加载技能逻辑行为树失败，使用默认模板:`,
              error,
            );
          }
        }

        // 如果没有技能特定逻辑，使用通用模板
        if (!skillLogicTree) {
          // 使用固定的路径标识符，确保缓存键匹配
          const templatePath = "skill_execution_template";
          const templateData = {
            ...skillExecutionTemplate,
            name: templatePath, // 确保 name 与路径一致
          } as unknown as TreeData;
          
          // 加载通用模板（会缓存到 templatePath 键下）
          await behaviorContext.loadTree(templateData);
          // 创建 Tree 实例，构造函数会从缓存中获取
          skillLogicTree = new Tree(behaviorContext, context, templatePath);
        }

        // 将行为树保存到 context
        // 注意：不需要单独保存 behaviorContext，可以通过 skillExecutionTree.context 访问
        context.skillExecutionTree = skillLogicTree;

        console.log(`👤 [${context.name}] 技能行为树初始化完成`);
      },
      推进技能行为树: function ({ context, event }) {
        if (!context.skillExecutionTree) {
          console.warn(`⚠️ [${context.name}] 技能行为树未初始化，无法推进`);
          return;
        }

        // 如果行为树已经完成或中断，不再推进
        const treeStatus = context.skillExecutionTree.status;
        if (treeStatus === "success" || treeStatus === "failure" || treeStatus === "interrupted") {
          // 行为树已完成或中断，不再推进
          return;
        }

        // 注意：不再需要手动同步 context 值到 blackboard
        // Blackboard.eval() 现在会自动访问 owner（即 context）的属性

        // 每帧推进行为树
        try {
          console.log(`🌳 [${context.name}] 推进行为树 tick...`);
          const status = context.skillExecutionTree.tick();
          console.log(`🌳 [${context.name}] 行为树 tick 完成，状态: ${status}`);
          
          // 如果行为树完成，记录最终状态
          if (status === "success" || status === "failure") {
            console.log(`👤 [${context.name}] 技能行为树执行完成，状态: ${status}`);
          } else if (status === "interrupted") {
            console.warn(`⚠️ [${context.name}] 技能行为树被中断`);
          }
        } catch (error) {
          console.error(`❌ [${context.name}] 技能行为树执行出错:`, error);
          // 出错时中断行为树，避免无限循环
          context.skillExecutionTree.interrupt();
          throw error;
        }
      },
      清理技能行为树: function ({ context, event }) {
        if (context.skillExecutionTree) {
          context.skillExecutionTree.clear();
          context.skillExecutionTree = null;
          console.log(`👤 [${context.name}] 技能行为树已清理`);
        }
      },
      转发行为树事件: function ({ context, event }) {
        // 通过 skillExecutionTree.context 访问行为树上下文，避免循环引用
        if (context.skillExecutionTree && event?.type) {
          const behaviorContext = context.skillExecutionTree.context;
          console.log(`🔁 [${context.name}] 转发行为树事件: ${event.type}`);
          // WaitForEvent 注册监听器时，target 是 context（默认），所以 dispatch 时不需要传 target
          // 或者传入 context 作为 target（但默认就是它自己，所以不传也可以）
          behaviorContext.dispatch(event.type);
        }
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
        // 测试内容
        //     context.engine.evaluateExpression(
        //       `var _E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97, _E6_9C_89_E6_95_88_E6_94_BB_E5_87_BB_E5_8A_9B, _E5_AE_9E_E9_99_85_E5_91_BD_E4_B8_AD_E7_8E_87, _E6_8A_80_E8_83_BD_E5_B8_B8_E6_95_B0, _E6_8A_80_E8_83_BD_E5_80_8D_E7_8E_87;
    
        // // 计算造成的伤害
        // function damage() {
        // _E6_9C_89_E6_95_88_E6_94_BB_E5_87_BB_E5_8A_9B = (self.statContainer.getValue("lv") + self.statContainer.getValue("lv")) * (1 - target.statContainer.getValue("red.p")) - target.statContainer.getValue("def.p") * (1 - self.statContainer.getValue("pie.p"));
        // _E6_8A_80_E8_83_BD_E5_B8_B8_E6_95_B0 = 100;
        // _E6_8A_80_E8_83_BD_E5_80_8D_E7_8E_87 = 1.5;
        // return (_E6_9C_89_E6_95_88_E6_94_BB_E5_87_BB_E5_8A_9B + _E6_8A_80_E8_83_BD_E5_B8_B8_E6_95_B0) * _E6_8A_80_E8_83_BD_E5_80_8D_E7_8E_87;
        // }
    
        // function mathRandomInt(a, b) {
        // if (a > b) {
        // // Swap a and b to ensure a is smaller.
        // var c = a;
        // a = b;
        // b = c;
        // }
        // return Math.floor(Math.random() * (b - a + 1) + a);
        // }
    
        // // 判断是否命中
        // function isHit() {
        // _E5_AE_9E_E9_99_85_E5_91_BD_E4_B8_AD_E7_8E_87 = 100 + ((self.statContainer.getValue("accuracy") - target.statContainer.getValue("avoid")) + _E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97) / 3;
        // console.log("命中率",_E5_AE_9E_E9_99_85_E5_91_BD_E4_B8_AD_E7_8E_87);
        // return mathRandomInt(1, 100) < _E5_AE_9E_E9_99_85_E5_91_BD_E4_B8_AD_E7_8E_87;
        // }
    
        // // 描述该功能...
        // function main() {
        // if (self.statContainer.getValue("mp.current") > _E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97) {
        // console.log("技能消耗",_E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97);
        // self.statContainer.addModifier("mp.current", 3, -_E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97, { id: "blockly_subtract", name: "积木减少", type: "system" });
        // console.log("技能消耗后当前MP",self.statContainer.getValue("mp.current"))
        // if (isHit() == true) {
        // console.log("命中成功, 伤害:",damage())
        // console.log("命中前血量:",target.statContainer.getValue("hp.current"))
        // target.statContainer.addModifier("hp.current", 3, -(damage()), { id: "blockly_subtract", name: "积木减少", type: "system" });
        // console.log("命中后血量:",target.statContainer.getValue("hp.current"))
        // } else {
        // console.log("miss")
        // }
        // }
        // }
    
        // _E6_8A_80_E8_83_BDMP_E6_B6_88_E8_80_97 = 100;
    
        // main();`,
        //       {
        //         currentFrame,
        //         casterId: context.id,
        //         skillLv: skill?.lv ?? 0,
        //         targetId: "defaultMember2Id",
        //       },
        //     );
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
      currentFrame: 0,
      currentSkillStartupFrames: 0,
      currentSkillChargingFrames: 0,
      currentSkillChantingFrames: 0,
      currentSkillActionFrames: 0,
      // 默认第一个机体
      skillList: player.data.player?.characters?.[0]?.skills ?? [],
      // 默认第一个机体
      skillCooldowns: player.data.player?.characters?.[0]?.skills?.map((s) => 0) ?? [],
      currentSkillEffect: null,
      currentSkillIndex: 0,
      skillStartFrame: 0,
      skillEndFrame: 0,
      currentSkill: null,
      statusTags: [],
      aggro: 0,
      // 默认第一个机体
      character: player.data.player!.characters?.[0] ?? null,
      // 技能执行行为树
      skillExecutionTree: null,
    },
    id: machineId,
    initial: "存活",
    on: {
      更新: {
        actions: {
          type: "更新玩家状态",
        },
      },
      收到前摇结束通知: {
        actions: {
          type: "转发行为树事件",
        },
      },
      收到蓄力结束通知: {
        actions: {
          type: "转发行为树事件",
        },
      },
      收到咏唱结束事件: {
        actions: {
          type: "转发行为树事件",
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
              actions: {
                type: "发送命中判定事件给自己",
              },
              guard: {
                type: "是物理伤害",
              },
            },
            {
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
                        guard: {
                          type: "没有可用技能效果",
                        },
                      },
                      {
                        target: "警告状态",
                        guard: {
                          type: "还未冷却",
                        },
                      },
                      {
                        target: "警告状态",
                        guard: {
                          type: "施法条件不满足",
                        },
                      },
                      {
                        target: "目标数据检查状态",
                        guard: {
                          type: "技能带有心眼",
                        },
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
                          guard: {
                            type: "目标不抵抗此技能的控制效果",
                          },
                        },
                        {
                          target: "警告状态",
                          guard: {
                            type: "目标抵抗此技能的控制效果",
                          },
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
                      { type: "初始化技能行为树" },
                      function ({ context }) {
                        console.log(`🎮 [${context.name}] 进入"执行技能中"状态`);
                      },
                    ],
                    on: {
                      更新: {
                        actions: {
                          type: "推进技能行为树",
                        },
                      },
                      收到发动结束通知: [
                        {
                          target: `#${machineId}.存活.可操作状态.技能处理状态`,
                          guard: {
                            type: "存在后续连击",
                          },
                          actions: {
                            type: "转发行为树事件",
                          },
                        },
                        {
                          target: `#${machineId}.存活.可操作状态.空闲状态`,
                          actions: {
                            type: "转发行为树事件",
                          },
                        },
                      ],
                    },
                    exit: [
                      {
                        type: "清理技能行为树",
                      },
                    ],
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
