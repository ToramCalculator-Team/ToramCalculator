import { fromCallback } from "xstate";
import type { PlayerStateContext } from "./PlayerStateMachine";
import { PlayerBehaviorContext } from "./PlayerBehaviorContext";
import { Tree, type TreeData, type TreeStatus } from "~/lib/behavior3/tree";
import skillExecutionTemplate from "./behaviorTree/skillExecutionTemplate.json";
import { magicCannonSkillEffect } from "./testSkills";

/**
 * BehaviorTreeActor 的输入类型
 */
export interface BehaviorTreeInput {
  /** 技能效果（可能包含自定义逻辑） */
  skillEffect: PlayerStateContext["currentSkillEffect"];
  /** 状态机上下文（owner） */
  owner: PlayerStateContext;
}

/**
 * BehaviorTreeActor 接收的事件类型
 */
export type BehaviorTreeEvent =
  | { type: "TICK" }
  | { type: "FSM_EVENT"; fsmEventType: string };

/**
 * BehaviorTreeActor 发送给父状态机的事件类型
 */
export type BehaviorTreeDoneEvent = {
  type: "行为树执行完成";
  output: BehaviorTreeOutput;
};

/**
 * BehaviorTreeActor 的输出类型
 */
export type BehaviorTreeOutput = {
  status: TreeStatus;
};

/**
 * 是否强制使用测试技能（开发调试用）
 * 设置为 true 时，无论数据库中的技能是什么，都会使用魔法炮测试技能
 */
// const FORCE_TEST_SKILL = true;
const FORCE_TEST_SKILL = false;

/**
 * 创建技能执行行为树
 */
function createSkillExecutionTree(
  input: BehaviorTreeInput,
): Tree<PlayerBehaviorContext, PlayerStateContext> {
  const { skillEffect, owner } = input;

  // 创建行为树上下文
  const behaviorContext = new PlayerBehaviorContext(owner);

  // 🔧 开发调试：强制使用测试技能
  let effectiveSkillEffect = skillEffect;
  if (FORCE_TEST_SKILL) {
    console.log(`🧪 [${owner.name}] 强制使用测试技能`);
    effectiveSkillEffect = magicCannonSkillEffect as typeof skillEffect;
  }

  // 尝试从 skill_effect.logic 加载技能特定的行为树
  let skillLogicTree: Tree<PlayerBehaviorContext, PlayerStateContext> | null = null;

  if (effectiveSkillEffect?.logic) {
    try {
      // logic 可能是 JSON 对象或字符串
      // 注意：使用 effectiveSkillEffect 而不是 skillEffect
      const logicData =
        typeof effectiveSkillEffect.logic === "string"
          ? JSON.parse(effectiveSkillEffect.logic)
          : effectiveSkillEffect.logic;

      if (logicData && typeof logicData === "object" && logicData.root) {
        // 使用固定的路径标识符，确保缓存键匹配
        const skillLogicPath = "skill_logic";
        const treeDataWithName = {
          ...logicData,
          name: skillLogicPath, // 确保 name 与路径一致
        } as TreeData;

        console.log(`✅ [${owner.name}] 使用技能特定的行为树逻辑`);
        // 加载技能特定的行为树（会缓存到 skillLogicPath 键下）
        behaviorContext.loadTree(treeDataWithName);
        // 创建 Tree 实例，构造函数会从缓存中获取
        skillLogicTree = new Tree(behaviorContext, owner, skillLogicPath);
      } else {
        console.log(`⚠️ [${owner.name}] logic 字段存在但格式不正确（缺少 root），将使用默认模板`);
      }
    } catch (error) {
      console.warn(
        `⚠️ [${owner.name}] 加载技能逻辑行为树失败，使用默认模板:`,
        error,
      );
    }
  } else {
    console.log(`ℹ️ [${owner.name}] logic 字段不存在，将使用默认模板`);
  }

  // 如果没有技能特定逻辑，使用通用模板
  if (!skillLogicTree) {
    console.log(`📋 [${owner.name}] 使用通用技能执行模板`);
    // 使用固定的路径标识符，确保缓存键匹配
    const templatePath = "skill_execution_template";
    const templateData = {
      ...skillExecutionTemplate,
      name: templatePath, // 确保 name 与路径一致
    } as unknown as TreeData;

    // 加载通用模板（会缓存到 templatePath 键下）
    behaviorContext.loadTree(templateData);
    // 创建 Tree 实例，构造函数会从缓存中获取
    skillLogicTree = new Tree(behaviorContext, owner, templatePath);
  }

  return skillLogicTree;
}

/**
 * BehaviorTreeActor
 * 
 * 封装行为树生命周期管理的 XState actor
 * 
 * 功能：
 * 1. 初始化行为树
 * 2. 响应 TICK 事件，推进行为树
 * 3. 响应 FSM_EVENT 事件，转发给行为树
 * 4. 行为树完成时发送 DONE 事件
 * 5. 清理资源
 */
export const behaviorTreeActor = fromCallback(({ input, sendBack, receive }: {
  input: BehaviorTreeInput;
  sendBack: (event: BehaviorTreeDoneEvent) => void;
  receive: (callback: (event: BehaviorTreeEvent) => void) => void;
}) => {
  console.log(`🌳 [${input.owner.name}] 初始化 BehaviorTreeActor`);

  // 1. 创建行为树
  const tree = createSkillExecutionTree(input);

  // 2. 初始化完成后立即执行一次 tick，将状态从初始的 "success" 改为 "running"
  try {
    const initialStatus = tree.tick();
  } catch (error) {
    console.error(`❌ [${input.owner.name}] 首次 tick 执行出错:`, error);
    tree.interrupt();
    sendBack({ type: "行为树执行完成", output: { status: "failure" } });
    return;
  }

  // 3. 监听事件
  receive((event) => {
    if (event.type === "TICK") {
      // 检查行为树状态
      const treeStatus = tree.status;
      if (treeStatus === "success" || treeStatus === "failure" || treeStatus === "interrupted") {
        // 行为树已完成或中断，不再推进
        return;
      }

      // 同步当前帧（从引擎获取，确保同步）
      const engineFrame = input.owner.engine.getFrameLoop().getFrameNumber();
      input.owner.currentFrame = engineFrame;
      // 注意：PlayerBehaviorContext.time 是 getter，直接返回 owner.currentFrame
      // 所以更新 owner.currentFrame 后，行为树时间会自动同步

      // 推进行为树
      try {
        // console.log(`🌳 [${input.owner.name}] 推进行为树 tick...`);
        const status = tree.tick();
        // console.log(`🌳 [${input.owner.name}] 行为树 tick 完成，状态: ${status}`);

        // 如果行为树完成，发送完成事件给父状态机
        if (status === "success" || status === "failure") {
          console.log(`👤 [${input.owner.name}] 技能行为树执行完成，状态: ${status}`);
          sendBack({ type: "行为树执行完成", output: { status } });
        } else if (status === "interrupted") {
          console.warn(`⚠️ [${input.owner.name}] 技能行为树被中断`);
          sendBack({ type: "行为树执行完成", output: { status: "interrupted" as TreeStatus } });
        }
      } catch (error) {
        console.error(`❌ [${input.owner.name}] 技能行为树执行出错:`, error);
        tree.interrupt();
        sendBack({ type: "行为树执行完成", output: { status: "failure" } });
      }
    } else if (event.type === "FSM_EVENT") {
      // 转发状态机事件到行为树
      const behaviorContext = tree.context;
      console.log(`🔁 [${input.owner.name}] 转发行为树事件: ${event.fsmEventType}`);
      behaviorContext.dispatch(event.fsmEventType);
    }
  });

  // 4. 清理函数
  return () => {
    console.log(`🧹 [${input.owner.name}] 清理 BehaviorTreeActor`);
    tree.clear();
  };
});

