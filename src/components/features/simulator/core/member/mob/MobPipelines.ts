import { z } from "zod/v4";
import { MobStateContext } from "./MobStateMachine";
import { PipeLineDef, PipeStageFunDef } from "../../pipeline/PipelineStageType";
import { skill_effectSchema } from "@db/generated/zod";
import { enqueueActions, EventObject } from "xstate";
import { MemberEventType } from "../Member";
import { createId } from "@paralleldrive/cuid2";
import { ModifierType, StatContainer } from "../../dataSys/StatContainer";
import { ExpressionContext } from "../../GameEngine";
import { MobAttrType } from "./Mob";

interface 复活 extends EventObject {
  type: "复活";
}
interface 移动 extends EventObject {
  type: "移动";
}
interface 停止移动 extends EventObject {
  type: "停止移动";
}
interface 使用技能 extends EventObject {
  type: "使用技能";
  data: { skillId: string };
}
interface 修改属性 extends EventObject {
  type: "修改属性";
  data: { attr: string; value: number };
}
interface 修改buff extends EventObject {
  type: "修改buff";
  data: { buffId: string; value: number };
}
interface 受到攻击 extends EventObject {
  type: "受到攻击";
  data: { origin: string; skillId: string };
}
interface 受到治疗 extends EventObject {
  type: "受到治疗";
  data: { origin: string; skillId: string };
}
interface 应用控制 extends EventObject {
  type: "应用控制";
}
interface 控制时间结束 extends EventObject {
  type: "控制时间结束";
}
interface 收到快照请求 extends EventObject {
  type: "收到快照请求";
  data: { senderId: string };
}
interface 收到目标快照 extends EventObject {
  type: "收到目标快照";
  data: { senderId: string };
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
interface 收到buff增删事件 extends EventObject {
  type: "收到buff增删事件";
  data: { buffId: string; value: number };
}
interface 收到前摇结束通知 extends EventObject {
  type: "收到前摇结束通知";
}
interface 收到发动结束通知 extends EventObject {
  type: "收到发动结束通知";
}
interface 收到咏唱结束通知 extends EventObject {
  type: "收到咏唱结束通知";
}
interface 收到蓄力结束通知 extends EventObject {
  type: "收到蓄力结束通知";
}

type MobEventType =
  | MemberEventType
  | 复活
  | 移动
  | 修改buff
  | 使用技能
  | 修改属性
  | 停止移动
  | 受到攻击
  | 受到治疗
  | 应用控制
  | 控制时间结束
  | 进行伤害计算
  | 进行命中判定
  | 进行控制判定
  | 收到buff增删事件
  | 收到前摇结束通知
  | 收到发动结束通知
  | 收到咏唱结束通知
  | 收到蓄力结束通知
  | 收到快照请求
  | 收到目标快照;

// action的源定义，将用来约束状态机逻辑和管线树结构
export type MobAction =
  | { type: "根据配置生成初始状态"; params: {} }
  | { type: "启用站立动画"; params: {} }
  | { type: "启用移动动画"; params: {} }
  | { type: "启用前摇动画"; params: {} }
  | { type: "计算前摇时长"; params: {} }
  | { type: "创建前摇结束通知"; params: {} }
  | { type: "启用蓄力动画"; params: {} }
  | { type: "计算蓄力时长"; params: {} }
  | { type: "创建蓄力结束通知"; params: {} }
  | { type: "启用咏唱动画"; params: {} }
  | { type: "计算咏唱时长"; params: {} }
  | { type: "创建咏唱结束通知"; params: {} }
  | { type: "启用技能发动动画"; params: {} }
  | { type: "计算发动时长"; params: {} }
  | { type: "创建发动结束通知"; params: {} }
  | { type: "技能效果管线"; params: {} }
  | { type: "重置控制抵抗时间"; params: {} }
  | { type: "中断当前行为"; params: {} }
  | { type: "启动受控动画"; params: {} }
  | { type: "重置到复活状态"; params: {} }
  | { type: "发送快照到请求者"; params: {} }
  | { type: "发送命中判定事件给自己"; params: {} }
  | { type: "反馈命中结果给施法者"; params: {} }
  | { type: "发送控制判定事件给自己"; params: {} }
  | { type: "命中计算管线"; params: {} }
  | { type: "根据命中结果进行下一步"; params: {} }
  | { type: "控制判定管线"; params: {} }
  | { type: "反馈控制结果给施法者"; params: {} }
  | { type: "发送伤害计算事件给自己"; params: {} }
  | { type: "伤害计算管线"; params: {} }
  | { type: "反馈伤害结果给施法者"; params: {} }
  | { type: "发送属性修改事件给自己"; params: {} }
  | { type: "发送buff修改事件给自己"; params: {} };

export type MobActionsType = MobAction["type"];



/**
 * 管线定义，用于zod验证和blockly生成
 */
export const mobPipDef = {
  计算前摇时长: [],
  根据配置生成初始状态: [],
  启用站立动画: [],
  启用移动动画: [],
  启用前摇动画: [],
  创建前摇结束通知: [],
  启用蓄力动画: [],
  计算蓄力时长: [],
  创建蓄力结束通知: [],
  启用咏唱动画: [],
  计算咏唱时长: [],
  创建咏唱结束通知: [],
  启用技能发动动画: [],
  计算发动时长: [],
  创建发动结束通知: [],
  技能效果管线: [],
  重置控制抵抗时间: [],
  中断当前行为: [],
  启动受控动画: [],
  重置到复活状态: [],
  发送快照到请求者: [],
  发送命中判定事件给自己: [],
  反馈命中结果给施法者: [],
  发送控制判定事件给自己: [],
  命中计算管线: [],
  根据命中结果进行下一步: [],
  控制判定管线: [],
  反馈控制结果给施法者: [],
  发送伤害计算事件给自己: [],
  伤害计算管线: [],
  反馈伤害结果给施法者: [],
  发送属性修改事件给自己: [],
  发送buff修改事件给自己: [],
} as const satisfies PipeLineDef<MobActionsType>;

export type MobPipelineDef = typeof mobPipDef;

/**
 * 管线阶段函数定义，用于运行
 */
export const mobPipFunDef: PipeStageFunDef<MobAction, MobPipelineDef, MobStateContext> = {
  计算前摇时长: {},
  根据配置生成初始状态: {},
  启用站立动画: {},
  启用移动动画: {},
  启用前摇动画: {},
  创建前摇结束通知: {},
  启用蓄力动画: {},
  计算蓄力时长: {},
  创建蓄力结束通知: {},
  启用咏唱动画: {},
  计算咏唱时长: {},
  创建咏唱结束通知: {},
  启用技能发动动画: {},
  计算发动时长: {},
  创建发动结束通知: {},
  技能效果管线: {},
  重置控制抵抗时间: {},
  中断当前行为: {},
  启动受控动画: {},
  重置到复活状态: {},
  发送快照到请求者: {},
  发送命中判定事件给自己: {},
  反馈命中结果给施法者: {},
  发送控制判定事件给自己: {},
  命中计算管线: {},
  根据命中结果进行下一步: {},
  控制判定管线: {},
  反馈控制结果给施法者: {},
  发送伤害计算事件给自己: {},
  伤害计算管线: {},
  反馈伤害结果给施法者: {},
  发送属性修改事件给自己: {},
  发送buff修改事件给自己: {},
};