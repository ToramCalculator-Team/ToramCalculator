import { assign, enqueueActions, EventObject, setup } from "xstate";
import type { ActionFunction } from "xstate";
import type { GuardPredicate } from "xstate/guards";
import { createId } from "@paralleldrive/cuid2";
import { MemberEventType, MemberSerializeData, MemberStateMachine } from "../Member";
import { Player, PlayerAttrType } from "./Player";
import { ModifierType } from "../../dataSys/StatContainer";
import { SkillEffectWithRelations } from "@db/repositories/skillEffect";
import { CharacterSkillWithRelations } from "@db/repositories/characterSkill";

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
}
interface 收到目标快照 extends EventObject {
  type: "收到目标快照";
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
  | 收到目标快照;

// 定义 PlayerStateContext 类型（提前声明）
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

// 使用 XState 的 ActionFunction 类型定义 actions
export const playerActions = {
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
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 发送快照获取请求`, event);
  },
  等待目标回复: function ({ context, event }) {
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 等待目标回复`, event);
  },
  技能消耗扣除: enqueueActions(({ context, event, enqueue }) => {
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
  }),
  启用前摇动画: function ({ context, event }) {
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 启用前摇动画`, event);
  },
  计算前摇时长: function ({ context, event }) {
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 计算前摇时长`, event);
  },
  创建前摇结束通知: function ({ context, event }) {
    // Add your action code here
    // ...
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
    const mspd = Math.min(0.5, Math.floor(context.statContainer.getValue("mspd")));
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
  启用蓄力动画: function ({ context, event }) {
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 启用蓄力动画`, event);
  },
  计算蓄力时长: function ({ context, event }) {
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 计算蓄力时长`, event);
  },
  创建蓄力结束通知: function ({ context, event }) {
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 创建蓄力结束通知`, event);
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
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 创建咏唱结束通知`, event);
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
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 创建发动结束通知`, event);
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
    // Add your action code here
    // ...
    console.log(`👤 [${context.name}] 发送快照到请求者`, event);
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
  logEvent: function ({ context, event }) {
    console.log(`👤 [${context.name}] 日志事件`, event);
  },
} as const satisfies Record<
  string,
  ActionFunction<PlayerStateContext, PlayerEventType, any, any, any, any, any, any, any>
>;

export const playerGuards = {
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

    // 咏唱阶段相关属性
    const chantingFixed = context.engine.evaluateExpression(effect.chantingFixed ?? "0", {
      currentFrame,
      casterId: context.id,
    });
    const chantingModified = context.engine.evaluateExpression(effect.chantingModified ?? "0", {
      currentFrame,
      casterId: context.id,
    });

    const chargeType = reservoirFixed + reservoirModified > 0 ? "有蓄力阶段" : "没有蓄力阶段";
    const chantingType = chantingFixed + chantingModified > 0 ? "有咏唱阶段" : "没有咏唱阶段";

    // 使用字符串拼接来创建唯一标识符
    const actionType = `${chargeType}_${chantingType}`;

    switch (actionType) {
      case "有蓄力阶段_有咏唱阶段":
        console.log(`👤 [${context.name}] 技能有蓄力阶段和咏唱阶段`);
        return true;
      case "有蓄力阶段_没有咏唱阶段":
        console.log(`👤 [${context.name}] 技能有蓄力阶段，没有咏唱阶段`);
        return true;
      case "没有蓄力阶段_有咏唱阶段":
        console.log(`👤 [${context.name}] 技能没有蓄力阶段，有咏唱阶段`);
        return true;
      case "没有蓄力动作_没有咏唱动作":
        console.log(`👤 [${context.name}] 技能没有蓄力阶段，没有咏唱阶段`);
        return false;
      default:
        console.log(`👤 [${context.name}] 技能没有蓄力阶段和没有咏唱阶段`);
        return false;
    }
  },
  存在咏唱阶段: function ({ context, event }) {
    // Add your guard condition here
    return true;
  },
  存在后续连击: function ({ context, event }) {
    // Add your guard condition here
    return true;
  },
  没有可用技能效果: function ({ context, event }) {
    // Add your guard condition here
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
  技能没有心眼: function ({ context, event }) {
    // Add your guard condition here
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
} as const satisfies Record<string, GuardPredicate<PlayerStateContext, PlayerEventType, any, any>>;

export const playerStateMachine = (player: Player) => {
  const machineId = player.id;

  const machine = setup({
    types: {
      context: {} as PlayerStateContext,
      events: {} as PlayerEventType,
      output: {} as Player,
    },
    actions: playerActions,
    guards: playerGuards,
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
                      {
                        type: "等待目标回复",
                      },
                    ],
                  },
                  执行技能中: {
                    initial: "前摇中",
                    entry: {
                      type: "技能消耗扣除",
                    },
                    states: {
                      前摇中: {
                        on: {
                          收到前摇结束通知: [
                            {
                              target: "蓄力中",
                              guard: {
                                type: "存在蓄力阶段",
                              },
                            },
                            {
                              target: "咏唱中",
                              guard: {
                                type: "存在咏唱阶段",
                              },
                            },
                            {
                              target: "发动中",
                            },
                          ],
                        },
                        entry: [
                          {
                            type: "启用前摇动画",
                          },
                          {
                            type: "计算前摇时长",
                          },
                          {
                            type: "创建前摇结束通知",
                          },
                        ],
                      },
                      蓄力中: {
                        on: {
                          收到蓄力结束通知: [
                            {
                              target: "咏唱中",
                              guard: {
                                type: "存在咏唱阶段",
                              },
                            },
                            {
                              target: "发动中",
                            },
                          ],
                        },
                        entry: [
                          {
                            type: "启用蓄力动画",
                          },
                          {
                            type: "计算蓄力时长",
                          },
                          {
                            type: "创建蓄力结束通知",
                          },
                        ],
                      },
                      咏唱中: {
                        on: {
                          收到咏唱结束通知: {
                            target: "发动中",
                          },
                        },
                        entry: [
                          {
                            type: "启用咏唱动画",
                          },
                          {
                            type: "计算咏唱时长",
                          },
                          {
                            type: "创建咏唱结束通知",
                          },
                        ],
                      },
                      发动中: {
                        on: {
                          收到发动结束通知: [
                            {
                              target:
                                `#${machineId}.存活.可操作状态.技能处理状态.初始化技能`,
                              guard: {
                                type: "存在后续连击",
                              },
                            },
                            {
                              target: `#${machineId}.存活.可操作状态.空闲状态`,
                            },
                          ],
                        },
                        entry: [
                          {
                            type: "启用技能发动动画",
                          },
                          {
                            type: "计算发动时长",
                          },
                          {
                            type: "创建发动结束通知",
                          },
                          {
                            type: "技能效果管线",
                          },
                        ],
                      },
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
