import { z, ZodTypeAny } from "zod/v3";
import { PlayerStateContext } from "./PlayerStateMachine";
import { skill_effectSchema } from "@db/generated/zod";
import { enqueueActions, EventObject } from "xstate";
import { MemberEventType } from "../Member";
import { createId } from "@paralleldrive/cuid2";
import { ModifierType, StatContainer } from "../../dataSys/StatContainer";
import { ExpressionContext } from "../../GameEngine";
import { PlayerAttrType } from "./Player";

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
  | 收到目标快照
  | 切换目标;

// action的源定义，将用来约束状态机逻辑和管线树结构
export type PlayerAction =
  | { type: "根据角色配置生成初始状态"; params: {} }
  | { type: "更新玩家状态"; params: {} }
  | { type: "启用站立动画"; params: {} }
  | { type: "启用移动动画"; params: {} }
  | { type: "显示警告"; params: {} }
  | { type: "创建警告结束通知"; params: {} }
  | { type: "发送快照获取请求"; params: {} }
  | { type: "添加待处理技能"; params: {} }
  | { type: "清空待处理技能"; params: {} }
  | {
      type: "技能消耗扣除";
      params: {
        expressionEvaluator: (expression: string, context: ExpressionContext) => number;
        statContainer: StatContainer<PlayerAttrType>;
      };
    }
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
  | { type: "发送buff修改事件给自己"; params: {} }
  | { type: "修改目标Id"; params: { targetId: string } }
  | { type: "logEvent"; params: {} };

export type PlayerActionsType = PlayerAction["type"];

/* ----------------- 静态阶段元组 ----------------- */
/** [ stageName, zodSchemaForThisStageOutput ] */
type staticStageTuple = readonly [string, ZodTypeAny];

/* ----------------- 辅助类型 ----------------- */
/** 从 Zod schema 推断输出类型 */
type OutputOfSchema<T extends ZodTypeAny> = z.infer<T>;

/** 管线定义，每个 action 对应静态阶段数组 */
type PipeLineDef<TActionName extends string> = {
  [K in TActionName]: readonly staticStageTuple[];
};

/* ----------------- 内部递归类型 ----------------- */
/**
 * 构建阶段函数：
 * - PrevCtx: 累积的 context（前序阶段输出叠加）
 * - PrevOut: 上一阶段输出类型（第一阶段 = action params）
 */
type _BuildStageFns<Stages extends readonly staticStageTuple[], PrevCtx, PrevOut> = Stages extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends staticStageTuple
    ? Rest extends readonly staticStageTuple[]
      ? {
          [K in First[0]]: (
            context: PrevCtx & OutputOfSchema<First[1]>,
            stageInput: PrevOut,
          ) => OutputOfSchema<First[1]>;
        } & _BuildStageFns<Rest, PrevCtx & OutputOfSchema<First[1]>, OutputOfSchema<First[1]>>
      : never
    : never
  : {};

/* ----------------- 从 pipeline 定义生成阶段函数签名 ----------------- */
/**
 * TDef: 管线定义
 * TContext: 基础 context 类型
 * 第一阶段输入 = 用户传入 params（类型自由）
 */
type PipeStageFunDef<
  TDef extends PipeLineDef<string>,
  TContext extends Record<string, any>,
  TParams extends Record<string, any> = any,
> = {
  [A in keyof TDef]: _BuildStageFns<TDef[A], TContext, TParams>;
};

/**
 * 管线定义，用于zod验证和blockly生成
 */
const playerPipDef = {
  技能消耗扣除: [
    ["技能HP消耗计算", z.object({ skillHpCostResult: z.number() })],
    ["技能MP消耗计算", z.object({ skillMpCostResult: z.number() })],
    ["仇恨值计算", z.object({ aggressionResult: z.number() })],
    ["仇恨值增加", z.object({ aggressionIncreaseResult: z.number() })],
    ["打印技能消耗结果", z.void()],
  ],
  计算前摇时长: [
    ["技能效果选择", z.object({ skillEffectResult: skill_effectSchema })],
    ["技能固定动作时长计算", z.object({ skillFixedMotionResult: z.number() })],
    ["技能可变动作时长计算", z.object({ skillModifiedMotionResult: z.number() })],
    ["行动速度计算", z.object({ mspdResult: z.number() })],
    ["前摇比例计算", z.object({ startupRatioResult: z.number() })],
    ["前摇帧数计算", z.object({ startupFramesResult: z.number() })],
    ["打印前摇帧结果", z.void()],
  ],
  根据角色配置生成初始状态: [],
  更新玩家状态: [],
  启用站立动画: [],
  启用移动动画: [],
  显示警告: [],
  创建警告结束通知: [],
  发送快照获取请求: [],
  添加待处理技能: [],
  清空待处理技能: [],
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
  修改目标Id: [],
  logEvent: [],
} as const satisfies PipeLineDef<PlayerActionsType>;

type PlayerPipLineDef = typeof playerPipDef;

/**
 * 管线阶段函数定义，用于运行
 */
const playerPipFun: PipeStageFunDef<PlayerPipLineDef, PlayerStateContext> = {
  技能消耗扣除: {
    技能HP消耗计算: (context, stageInput) => {
      return {
        skillHpCostResult: stageInput.z,
      };
    },
    技能MP消耗计算: (context, stageInput) => {
      return {
        skillMpCostResult: stageInput.skillHpCostResult,
      };
    },
    仇恨值计算: (context, stageInput) => {
      context.skillHpCostResult;
      return {
        aggressionResult: stageInput.skillMpCostResult,
      };
    },
    仇恨值增加: (context, stageInput) => {
      return {
        aggressionIncreaseResult: stageInput.aggressionResult,
      };
    },
    打印技能消耗结果: (context, stageInput) => {
      console.log(`👤 [${context.name}] 技能HP消耗：`, context.skillHpCostResult);
      console.log(`👤 [${context.name}] 技能MP消耗：`, context.skillMpCostResult);
      console.log(`👤 [${context.name}] 仇恨值：`, context.aggressionResult);
      console.log(`👤 [${context.name}] 仇恨值增加：`, context.aggressionIncreaseResult);
    },
  },
  计算前摇时长: {
    技能效果选择: (context, stageInput) => {
      const skillEffect = context.currentSkillEffect;
      if (!skillEffect) {
        throw new Error(`🎮 [${context.name}] 的当前技能效果不存在`);
      }
      return {
        skillEffectResult: skillEffect,
      };
    },
    技能固定动作时长计算: (context, stageInput) => {
      const fixedMotionExpression = context.skillEffectResult.motionFixed;
      const skill = context.currentSkill;
      if (!skill) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const fixedMotion = context.engine.evaluateExpression(fixedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      return {
        skillFixedMotionResult: fixedMotion,
      };
    },
    技能可变动作时长计算: (context, stageInput) => {
      const skill = context.currentSkill;
      if (!skill) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const modifiedMotionExpression = context.skillEffectResult.motionModified;
      const modifiedMotion = context.engine.evaluateExpression(modifiedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      return {
        skillModifiedMotionResult: modifiedMotion,
      };
    },
    行动速度计算: (context, stageInput) => {
      const mspd = context.statContainer.getValue("mspd");
      return {
        mspdResult: mspd,
      };
    },
    前摇比例计算: (context, stageInput) => {
      const startupRatioExpression = context.skillEffectResult.startupFrames;
      const startupRatio = context.engine.evaluateExpression(startupRatioExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return {
        startupRatioResult: startupRatio,
      };
    },
    前摇帧数计算: (context, stageInput) => {
      const startupFramesExpression = context.skillEffectResult.startupFrames;
      const startupFrames = context.engine.evaluateExpression(startupFramesExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return {
        startupFramesResult: startupFrames,
      };
    },
    打印前摇帧结果: (context, stageInput) => {
      console.log(`👤 [${context.name}] 前摇帧数：`, stageInput.startupFramesResult);
    },
  },
  根据角色配置生成初始状态: {},
  更新玩家状态: {},
  启用站立动画: {},
  启用移动动画: {},
  显示警告: {},
  创建警告结束通知: {},
  发送快照获取请求: {},
  添加待处理技能: {},
  清空待处理技能: {},
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
  修改目标Id: {},
  logEvent: {},
};

type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

/* ---------- 获取到某阶段（含当前）的前序定义 ---------- */
type GetPreviousAndCurrentStageDefs<
  TStages extends readonly staticStageTuple[],
  StopStage extends string,
  Acc extends readonly staticStageTuple[] = []
> =
  TStages extends readonly [infer First, ...infer Rest]
    ? First extends readonly [infer Name extends string, infer Schema extends ZodTypeAny] // ← 关键：约束 Schema 为 ZodTypeAny
      ? Rest extends readonly staticStageTuple[]
        ? Equal<Name, StopStage> extends true
          ? [...Acc, First] // include current
          : GetPreviousAndCurrentStageDefs<Rest, StopStage, [...Acc, First]>
        : Acc
      : Acc
    : Acc;

/* ---------- 累积输出为交叉类型 ---------- */
type OutputsUnionFromDefs<TDefs extends readonly staticStageTuple[]> =
  TDefs[number] extends readonly [any, infer S] ? (S extends ZodTypeAny ? OutputOfSchema<S> : never) : never;

type AccumulateStageOutputs<TDefs extends readonly staticStageTuple[]> =
  UnionToIntersection<OutputsUnionFromDefs<TDefs>>;

/* ---------- 阶段名 / schema / 输出 提取 ---------- */
type StageNamesOf<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName
> = TDef[A][number] extends readonly [infer N extends string, any] ? N : never;

type StageSchemaOf<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName,
  S extends StageNamesOf<TActionName, TDef, A>
> = Extract<TDef[A][number], readonly [S, any]>[1];

type StageOutputOf<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName,
  S extends StageNamesOf<TActionName, TDef, A>
> = StageSchemaOf<TActionName, TDef, A, S> extends ZodTypeAny ? OutputOfSchema<StageSchemaOf<TActionName, TDef, A, S>> : never;

/* ---------- 执行上下文到该阶段（含） ---------- */
type StageExecutionContextAfter<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName,
  S extends StageNamesOf<TActionName, TDef, A>,
  TCtx extends Record<string, any>
> = TCtx & AccumulateStageOutputs<GetPreviousAndCurrentStageDefs<TDef[A], S>>;

/* ----------------- 动态阶段 handler 类型 ----------------- */
/**
 * 动态阶段通常期望：
 *  - ctx: 能看到基础 ctx + 到该阶段（含）的所有前序输出
 *  - input: 是所插入点对应静态阶段的输出类型（I = 输出类型）
 *  - 返回值可以是该输出类型（替换/修改），也可以部分更新 ctx（Partial），或 void
 */
type DynamicHandlerForStage<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName,
  S extends StageNamesOf<TActionName, TDef, A>,
  TCtx extends Record<string, any>
> =
  (ctx: StageExecutionContextAfter<TActionName, TDef, A, S, TCtx>, input: StageOutputOf<TActionName, TDef, A, S>)
  => StageOutputOf<TActionName, TDef, A, S> | Partial<StageExecutionContextAfter<TActionName, TDef, A, S, TCtx>> | void;

/* ----------------- PipelineManager ----------------- */
export class PipelineManager<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  TCtx extends Record<string, any>,
  TParams = any
> {
  constructor(public readonly pipelineDef: TDef) {}

  private dynamicStages: {
    [A in TActionName]?: {
      [S in StageNamesOf<TActionName, TDef, A>]?: Array<DynamicHandlerForStage<TActionName, TDef, A, S, TCtx>>;
    };
  } = {} as any;

  /** 缓存已编译的执行链 */
  private compiledChains: Partial<Record<TActionName, (ctx: TCtx, params?: TParams) => Promise<TCtx>>> = {};

  getStaticStages<A extends TActionName>(action: A): readonly staticStageTuple[] {
    return this.pipelineDef[action];
  }

  insertDynamicStage<
    A extends TActionName,
    S extends StageNamesOf<TActionName, TDef, A>
  >(action: A, afterStage: S, handler: DynamicHandlerForStage<TActionName, TDef, A, S, TCtx>) {
    const map = (this.dynamicStages[action] ??= {} as any);
    const list = (map[afterStage] ??= [] as any) as Array<typeof handler>;
    list.push(handler);
    this.compiledChains[action] = undefined; // 失效缓存
  }

  removeDynamicStage<
    A extends TActionName,
    S extends StageNamesOf<TActionName, TDef, A>
  >(action: A, afterStage: S, handler: DynamicHandlerForStage<TActionName, TDef, A, S, TCtx>) {
    const map = this.dynamicStages[action];
    if (!map) return;
    const list = map[afterStage] as Array<typeof handler> | undefined;
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
    this.compiledChains[action] = undefined; // 失效缓存
  }

  getDynamicHandlersForStage<A extends TActionName, S extends StageNamesOf<TActionName, TDef, A>>(
    action: A,
    stage: S
  ) {
    return (this.dynamicStages[action] && this.dynamicStages[action]![stage]) ?? ([] as Array<DynamicHandlerForStage<TActionName, TDef, A, S, TCtx>>);
  }

  /** 编译某个 action 的执行链 */
  private compile<K extends TActionName>(
    action: K,
    stageFns: Record<string, (ctx: any, input: any) => any>
  ): (ctx: TCtx, params?: TParams) => Promise<TCtx> {
    const staticStages = this.pipelineDef[action];
    const dynamicStages = this.dynamicStages[action];

    const steps = staticStages.map(([stageName, schema]) => {
      const staticHandler =
        (stageFns as any)[action]?.[stageName] ?? (stageFns as any)[stageName];

      const dynHandlers =
        dynamicStages?.[stageName as StageNamesOf<TActionName, TDef, K>] ?? [];

      return async (ctx: any) => {
        // ---------- 静态阶段 ----------
        if (staticHandler) {
          const out = await staticHandler(ctx, ctx);
          if (schema) {
            const parsed = schema.safeParse(out);
            if (!parsed.success) throw parsed.error;
            Object.assign(ctx, parsed.data);
          } else if (out && typeof out === "object") {
            Object.assign(ctx, out);
          }
        }

        // ---------- 动态阶段 ----------
        for (const dyn of dynHandlers) {
          const out = await dyn(ctx, ctx);
          if (out && typeof out === "object") Object.assign(ctx, out);
        }

        return ctx;
      };
    });

    return async (ctx: TCtx, params?: TParams) => {
      let current: any = Object.assign({}, ctx, params ?? {});
      for (const step of steps) {
        current = await step(current);
      }
      return current as TCtx;
    };
  }

  /** 对外统一执行入口（自动缓存编译链） */
  async runCompiled<K extends TActionName>(
    action: K,
    stageFns: Record<string, (ctx: any, input: any) => any>,
    ctx: TCtx,
    params?: TParams
  ) {
    if (!this.compiledChains[action]) {
      this.compiledChains[action] = this.compile(action, stageFns);
    }
    return this.compiledChains[action]!(ctx, params);
  }
}