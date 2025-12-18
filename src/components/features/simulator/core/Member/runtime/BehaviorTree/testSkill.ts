import type { skill, skill_effect } from "@db/generated/zod";
import type { SkillEffectLogicV1 } from "./SkillEffectLogicType";

/**
 * 魔法炮技能效果 - 使用行为树 JSON
 * logic 字段存储完整的行为树定义
 */
export const magicCannonSkillEffect = {
  id: "MagicCannonEffect1Id",
  belongToskillId: "MagicCannonId",
  condition: "true",
  elementLogic: "mainWeapon.element",
  castingRange: "10",
  effectiveRange: 10,
  motionFixed: "ctx.magicCannon?.phase == 1 ? 12 : 18",
  motionModified: "ctx.magicCannon?.phase == 1 ? 170 : 31",
  chantingFixed: "0",
  chantingModified: "0",
  reservoirFixed: "0",
  reservoirModified: "0",
  startupFrames: "0",
  hpCost: null,
  // 如果已存在魔法炮充能 Buff，则消耗700MP；否则消耗0MP
  mpCost: "self.buffManager.hasBuff('magic_cannon_charge') ? 700 : 0",
  description: "魔法炮充能/释放逻辑，使用标准 SkillEffectLogic v1 结构（trees + pipelines + buffs）。",
  logic: {
    schemaVersion: 1 as const,
    /**
     * 1) trees.skillBT：沿用当前魔法炮技能的完整行为树（前摇/蓄力/咏唱/发动 + Switch 分支）。
     *    仅做轻度精简：初始化 magicCannon，走默认四段流程，并在发动阶段分支处理充能/释放。
     */
    trees: {
      skillBT: {
        name: "magic-cannon-logic",
        desc: "魔法炮技能执行行为树（基于通用模板，发动阶段分支处理充能/释放）",
        root: {
          id: 1,
          name: "Sequence",
          desc: "技能执行主流程",
          args: {},
          input: [],
          output: [],
          children: [
            {
              id: 1,
              name: "Let",
              desc: "初始化 magicCannon 对象（仅在第一次使用时初始化）",
              args: {
                value: { phase: 0, stacks: 0, hasGauge: false },
              },
              input: [],
              output: ["magicCannon"],
            },
            {
              id: 4,
              name: "HasBuff",
              desc: "决定魔法炮：充能/释放分支",
              args: { buffId: "magic_cannon_charge", outputVar: "buffExists" },
              input: [],
              output: [],
            },
            {
              id: 7,
              name: "Switch",
              desc: "魔法炮：按是否存在充能 Buff 分支执行（语义化管线：前摇/动作）",
              args: {},
              input: [],
              output: [],
              children: [
                {
                  id: 8,
                  name: "Case",
                  desc: "充能分支（无充能 Buff）：充能前摇 -> 等待 -> 充能动作 -> 等待后摇 -> 技能完成",
                  args: {},
                  input: [],
                  output: [],
                  children: [
                    { id: 8.1, name: "Check", args: { value: "!buffExists" }, input: [], output: [] },
                    {
                      id: 8.2,
                      name: "Sequence",
                      args: {},
                      input: [],
                      output: [],
                      children: [
                        {
                          id: 8.2_1,
                          name: "RunPipelineSync",
                          desc: "充能前摇（语义管线）",
                          args: { actionGroupName: "魔法炮.充能.前摇" },
                          input: [],
                          output: [],
                        },
                        {
                          id: 8.2_2,
                          name: "WaitFrames",
                          args: { field: "currentSkillStartupFrames", min: 1 },
                          input: [],
                          output: [],
                        },
                        {
                          id: 8.2_3,
                          name: "RunPipelineSync",
                          desc: "充能动作（语义管线）",
                          args: {
                            actionGroupName: "魔法炮.充能.动作",
                            params: {
                              buffId: "magic_cannon_charge",
                              buffName: "魔法炮充能",
                              duration: -1,
                              variables: { chargeCounter: 0, initialFrame: 0 },
                              treeId: "magic_cannon_charge",
                            },
                          },
                          input: [],
                          output: [],
                        },
                        {
                          id: 8.2_4,
                          name: "WaitFrames",
                          args: { field: "currentSkillActionFrames", min: 1 },
                          input: [],
                          output: [],
                        },
                        {
                          id: 8.2_5,
                          name: "ScheduleFSMEvent",
                          desc: "通知状态机：技能执行完成",
                          args: { eventType: "技能执行完成" },
                          input: [],
                          output: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 9,
                  name: "Case",
                  desc: "释放分支（有充能 Buff）：发动前摇 -> 等待 -> 发动动作(伤害/清 buff) -> 等待后摇 -> 技能完成",
                  args: {},
                  input: [],
                  output: [],
                  children: [
                    { id: 9.1, name: "Check", args: { value: "buffExists" }, input: [], output: [] },
                    {
                      id: 9.2,
                      name: "Sequence",
                      args: {},
                      input: [],
                      output: [],
                      children: [
                        {
                          id: 9.2_1,
                          name: "RunPipelineSync",
                          desc: "发动前摇（语义管线）",
                          args: { actionGroupName: "魔法炮.释放.前摇" },
                          input: [],
                          output: [],
                        },
                        {
                          id: 9.2_2,
                          name: "WaitFrames",
                          args: { field: "currentSkillStartupFrames", min: 1 },
                          input: [],
                          output: [],
                        },
                        {
                          id: 9.2_3,
                          name: "RunPipelineSync",
                          desc: "发动动作（语义管线）",
                          args: {
                            actionGroupName: "魔法炮.释放.动作",
                            params: {
                              buffId: "magic_cannon_charge",
                              damageFormula:
                                '(((self.statContainer.getValue("atk.m") + self.lv - target.lv) * (1 - target.statContainer.getValue("red.m")) - (1 - self.statContainer.getValue("pip.m")) * target.statContainer.getValue("def.m")) + 700 + 10 * chargeCounter) * (300 * chargeCounter + self.statContainer.getValue("int") * Math.min(chargeCounter, 5))',
                            },
                          },
                          input: [],
                          output: [],
                        },
                        {
                          id: 9.2_4,
                          name: "WaitFrames",
                          args: { field: "currentSkillActionFrames", min: 1 },
                          input: [],
                          output: [],
                        },
                        {
                          id: 9.2_5,
                          name: "ScheduleFSMEvent",
                          desc: "通知状态机：技能执行完成",
                          args: { eventType: "技能执行完成" },
                          input: [],
                          output: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 10,
                  name: "Case",
                  args: {},
                  input: [],
                  output: [],
                  children: [
                    { id: 10.1, name: "Check", args: { value: "true" }, input: [], output: [] },
                    { id: 10.2, name: "JustSuccess", args: {}, input: [], output: [] },
                  ],
                },
              ],
            },
          ],
        },
        group: [],
      },
      /**
       * 2) buffBTs：魔法炮充能 Buff 的行为树
       *    - 生效时，向目标管线插入动态阶段
       *    - 结束时依赖 BuffManager.removeStagesBySource 清理
       */
      buffBTs: {
        magic_cannon_charge: {
          name: "magic_cannon_charge_bt",
          root: {
            id: "b1",
            name: "Sequence",
            args: {},
            input: [],
            output: [],
            children: [
              {
                id: "b2",
                name: "InsertDynamicStage",
                args: {
                  source: "buff.magic_cannon_charge",
                  targets: [
                    {
                      // 将充能逻辑插到 "应用技能效果" 之后
                      actionGroupName: "skill.effect.apply",
                      afterActionName: "应用当前技能效果",
                      priority: 100,
                      // 推荐：只插入 stage（例如 "应用数值表达式"）
                      insertActionName: "应用数值表达式",
                      params: {
                        // 注意：UI 的 Buff 面板读取的是 BuffManager.variables
                        // 因此这里用 buffVar 约定路径，直接落到 buff.variables.chargeCounter
                        targetPath: "buffVar.magic_cannon_charge.chargeCounter",
                        // 设计：其它魔法技能释放后，按“咏唱帧数/60”向上取整增加充能
                        expression: "x + Math.max(1, Math.ceil(chantingFrames / 60))",
                        vars: { chantingFrames: "ctx.currentSkillChantingFrames ?? 0" },
                      },
                    },
                  ],
                },
                input: [],
                output: [],
              },
              {
                id: "b3",
                name: "Repeat",
                desc: "每60帧自动+1充能（满足你当前 UI 预期）",
                args: { count: 999999999 },
                input: [],
                output: [],
                children: [
                  {
                    id: "b3.1",
                    name: "Sequence",
                    args: {},
                    input: [],
                    output: [],
                    children: [
                      { id: "b3.1.1", name: "Wait", args: { time: 60 }, input: [], output: [] },
                      {
                        id: "b3.1.2",
                        name: "RunStage",
                        args: {
                          actionName: "应用数值表达式",
                          params: {
                            targetPath: "buffVar.magic_cannon_charge.chargeCounter",
                            expression: "x + 1",
                          },
                        },
                        input: [],
                        output: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          group: [],
        },
      },
    },

    /**
     * 3) pipelines.overrides：自定义管线编排覆盖
     * 注意：PipelineManager 运行时只能执行“已注册的 pipelineName”
     * 因此需要把 BT 中会调用到的 pipelineName 都写在 overrides 里。
     */
    pipelines: {
      overrides: {
        /**
         * 说明（读这个区块就能理解分组依据）：
         * - 本 overrides 只做“可用管线列表（pipelineName -> stages）”的声明，不表达控制流；
         * - 控制流（分支/顺序/等待）由 trees.skillBT 负责；
         * - 分组按“阶段/用途”组织：先算（消耗/动作时长）→ 再做（动画/效果）→ 最后做（魔法炮分支副作用）。
         */

        // ===================== 0) 魔法炮：语义化阶段管线（推荐在 skillBT 中调用） =====================
        // 充能：前摇
        "魔法炮.充能.前摇": ["技能HP消耗计算", "技能MP消耗计算", "技能消耗扣除", "前摇帧数计算", "启动前摇动画"],
        // 充能：动作（注意：这里的“动作帧数/后摇等待”由 skillBT 的 WaitFrames 负责）
        "魔法炮.充能.动作": ["发动帧数计算", "启动发动动画", "添加Buff"],
        // 释放：前摇
        "魔法炮.释放.前摇": ["技能HP消耗计算", "技能MP消耗计算", "技能消耗扣除", "前摇帧数计算", "启动前摇动画"],
        // 释放：动作（包含伤害/清除buff，避免一个动作一个管线）
        "魔法炮.释放.动作": [
          "发动帧数计算",
          "启动发动动画",
          "应用当前技能效果",
          "获取buff计数器值",
          "对目标造成伤害",
          "移除Buff",
        ],

        // ===================== 1) 技能效果应用（buffBT 插入点依赖该管线名） =====================
        "skill.effect.apply": ["应用当前技能效果"],
      },
    },

    /**
     * 4) buffs：技能内声明的 Buff 实例
     */
    buffs: [
      {
        id: "magic_cannon_charge",
        name: "魔法炮充能",
        durationMs: -1, // -1 表示永久
        variables: {
          chargeCounter: 0,
          initialFrame: 0,
        },
        treeId: "magic_cannon_charge", // 对应 trees.buffBTs 中的 key
      },
    ],
  },
  details:
    "logic 使用标准 SkillEffectLogic v1 结构：trees（skillBT + buffBTs）/ pipelines.overrides / buffs。魔法炮充能通过 buff 行为树在其他技能的发动管线后插入动态阶段，并用表达式型阶段基于咏唱帧数更新充能。",
} as unknown as Omit<skill_effect, "logic"> & { logic: SkillEffectLogicV1 };

export const testSkillEffect: Record<string, Omit<skill_effect, "logic"> & { logic: SkillEffectLogicV1 }> = {
  MagicCannon: magicCannonSkillEffect,
};
