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
            { id: 5, name: "RunPipelineSync", desc: "计算技能消耗", args: { actionGroupName: "skill.cost.calculate" }, input: [], output: [] },
            {
              id: 6,
              name: "RunPipelineSync",
              desc: "计算技能动作时长",
              args: { actionGroupName: "skill.motion.calculate" },
              input: [],
              output: [],
            },
          {
            id: 7,
            name: "IfElse",
            desc: "前摇阶段（如果存在）",
              args: {},
              input: [],
              output: [],
            children: [
                { id: 8, name: "Check", args: { value: "currentSkillStartupFrames > 0" }, input: [], output: [] },
              {
                id: 9,
                name: "Sequence",
                  args: {},
                  input: [],
                  output: [],
                children: [
                    { id: 10, name: "RunPipeline", args: { actionGroupName: "animation.startup.start" }, input: [], output: [] },
                    { id: 11, name: "RunPipeline", args: { actionGroupName: "event.startup.schedule" }, input: [], output: [] },
                    { id: 12, name: "WaitForEvent", args: { event: "收到前摇结束通知" }, input: [], output: [] },
                ],
              },
                { id: 13, name: "JustSuccess", args: {}, input: [], output: [] },
            ],
          },
          {
            id: 14,
            name: "IfElse",
            desc: "蓄力阶段（如果存在）",
              args: {},
              input: [],
              output: [],
            children: [
                { id: 15, name: "Check", args: { value: "currentSkillChargingFrames > 0" }, input: [], output: [] },
              {
                id: 16,
                name: "Sequence",
                  args: {},
                  input: [],
                  output: [],
                children: [
                    { id: 17, name: "RunPipeline", args: { actionGroupName: "animation.charging.start" }, input: [], output: [] },
                    { id: 18, name: "RunPipeline", args: { actionGroupName: "event.charging.schedule" }, input: [], output: [] },
                    { id: 19, name: "WaitForEvent", args: { event: "收到蓄力结束通知" }, input: [], output: [] },
                ],
              },
                { id: 20, name: "JustSuccess", args: {}, input: [], output: [] },
            ],
          },
          {
            id: 21,
            name: "IfElse",
            desc: "咏唱阶段（如果存在）",
              args: {},
              input: [],
              output: [],
            children: [
                { id: 22, name: "Check", args: { value: "currentSkillChantingFrames > 0" }, input: [], output: [] },
              {
                id: 23,
                name: "Sequence",
                  args: {},
                  input: [],
                  output: [],
                children: [
                    { id: 24, name: "RunPipeline", args: { actionGroupName: "animation.chanting.start" }, input: [], output: [] },
                    { id: 25, name: "RunPipeline", args: { actionGroupName: "event.chanting.schedule" }, input: [], output: [] },
                    { id: 26, name: "WaitForEvent", args: { event: "收到咏唱结束事件" }, input: [], output: [] },
                ],
              },
                { id: 27, name: "JustSuccess", args: {}, input: [], output: [] },
            ],
          },
          {
            id: 27,
            name: "Sequence",
            desc: "发动阶段",
              args: {},
              input: [],
              output: [],
            children: [
                { id: 28, name: "RunPipeline", args: { actionGroupName: "animation.action.start" }, input: [], output: [] },
                { id: 29, name: "RunPipeline", args: { actionGroupName: "skill.effect.apply" }, input: [], output: [] },
              {
                id: 29.1,
                name: "HasBuff",
                desc: "检查魔法炮充能 Buff 状态，获取 buffExists 变量",
                args: { buffId: "magic_cannon_charge", outputVar: "buffExists" },
                  input: [],
                  output: [],
              },
              {
                id: 30,
                name: "Switch",
                desc: "根据 Buff 状态分支执行不同逻辑（充能 / 释放）",
                  args: {},
                  input: [],
                  output: [],
                children: [
                  {
                    id: 31,
                    name: "Case",
                        args: {},
                        input: [],
                        output: [],
                    children: [
                          { id: 32, name: "Check", args: { value: "!buffExists" }, input: [], output: [] },
                      {
                        id: 33,
                        name: "Sequence",
                        desc: "充能阶段：添加 Buff，等待其他魔法技能充能",
                            args: {},
                            input: [],
                            output: [],
                        children: [
                          {
                            id: 37,
                            name: "RunPipeline",
                            desc: "添加魔法炮充能 Buff",
                            args: {
                              actionGroupName: "buff.add",
                              params: {
                                buffId: "magic_cannon_charge",
                                buffName: "魔法炮充能",
                                duration: -1,
                                variables: { chargeCounter: 0, initialFrame: 0 },
                              },
                            },
                              input: [],
                              output: [],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    id: 37,
                    name: "Case",
                      args: {},
                      input: [],
                      output: [],
                    children: [
                        { id: 38, name: "Check", args: { value: "buffExists" }, input: [], output: [] },
                      {
                        id: 39,
                        name: "Sequence",
                        desc: "释放阶段：消耗充能造成伤害并移除 Buff",
                          args: {},
                          input: [],
                          output: [],
                        children: [
                          {
                            id: 41,
                            name: "RunPipelineSync",
                            desc: "获取充能计数器（写入 chargeCounter）",
                            args: { actionGroupName: "获取buff计数器值", params: { buffId: "magic_cannon_charge" } },
                              input: [],
                              output: [],
                          },
                          {
                            id: 42,
                            name: "RunPipeline",
                            desc: "请求魔法炮伤害结算（依赖 chargeCounter）",
                            args: {
                              actionGroupName: "combat.damage.request",
                              params: {
                                damageFormula:
                                    '(((self.statContainer.getValue("atk.m") + self.lv - target.lv) * (1 - target.statContainer.getValue("red.m")) - (1 - self.statContainer.getValue("pip.m")) * target.statContainer.getValue("def.m")) + 700 + 10 * chargeCounter) * (300 * chargeCounter + self.statContainer.getValue("int") * Math.min(chargeCounter, 5))',
                              },
                            },
                              input: [],
                              output: [],
                          },
                            {
                              id: 43,
                              name: "RunPipeline",
                              desc: "移除充能 Buff",
                              args: { actionGroupName: "buff.remove", params: { buffId: "magic_cannon_charge" } },
                              input: [],
                              output: [],
                            },
                        ],
                      },
                    ],
                  },
                    {
                      id: 44,
                      name: "Case",
                      args: {},
                      input: [],
                      output: [],
                      children: [
                        { id: 45, name: "Check", args: { value: "true" }, input: [], output: [] },
                        { id: 46, name: "JustSuccess", args: {}, input: [], output: [] },
                      ],
                    },
                ],
              },
                {
                  id: 48,
                  name: "RunPipeline",
                  desc: "调度发动结束事件",
                  args: { actionGroupName: "event.action.schedule" },
                  input: [],
                  output: [],
                },
                { id: 49, name: "WaitForEvent", desc: "等待发动结束通知", args: { event: "收到发动结束通知" }, input: [], output: [] },
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
        // --- 计算/查询类（同步节点 RunPipelineSync 会用到） ---
        "skill.cost.calculate": ["技能HP消耗计算", "技能MP消耗计算", "技能消耗扣除"],
        "skill.motion.calculate": ["前摇帧数计算", "蓄力帧数计算", "咏唱帧数计算"],
        "获取buff计数器值": ["获取buff计数器值"],

        // --- 动画/事件（intent 节点 RunPipeline 会用到） ---
        "animation.startup.start": ["启动前摇动画"],
        "event.startup.schedule": ["调度前摇结束事件"],
        "animation.charging.start": ["启动蓄力动画"],
        "event.charging.schedule": ["调度蓄力结束事件"],
        "animation.chanting.start": ["启动咏唱动画"],
        "event.chanting.schedule": ["调度咏唱结束事件"],
        "animation.action.start": ["启动发动动画"],
        "event.action.schedule": ["调度发动结束事件"],

        // --- 技能效果/外部副作用 ---
        "skill.effect.apply": ["应用当前技能效果"],
        "buff.add": ["添加Buff"],
        "buff.remove": ["移除Buff"],
        "combat.damage.request": ["对目标造成伤害"],

        // --- 预留：由其它技能触发的魔法炮充能流程 ---
        "magic_cannon.charge_from_skill": ["咏唱帧数计算", "应用数值表达式"],
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
