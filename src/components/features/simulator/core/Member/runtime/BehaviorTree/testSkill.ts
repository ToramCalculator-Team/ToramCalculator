import type { skill, skill_effect } from "@db/generated/zod";

/**
 * 魔法炮（测试用技能）
 *
 * 约定：
 * - skill_effect.logic 存储行为树 JSON
 * - 行为树使用 RunPipeline 调用管线，使用 ScheduleFSMEvent 发送状态机事件
 * - 最后必须调用 ScheduleFSMEvent("收到发动结束通知") 来触发状态机转换
 */

export const magicCannonSkill: skill = {
  id: "MagicCannonId",
  treeType: "MagicSkill",
  posX: 3,
  posY: 2,
  tier: 4,
  name: "魔法炮",
  isPassive: false,
  chargingType: "Reservoir",
  distanceType: "Both",
  targetType: "Enemy",
  details: "测试用魔法炮，包含充能与释放两个阶段。",
  dataSources: "system",
  statisticId: "MagicCannonStatisticId",
  updatedByAccountId: null,
  createdByAccountId: null,
};

/**
 * 魔法炮技能效果 - 使用行为树 JSON
 * logic 字段存储完整的行为树定义
 */
export const magicCannonSkillEffect: skill_effect = {
  id: "MagicCannonEffect1Id",
  belongToskillId: magicCannonSkill.id,
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
  description: "魔法炮充能/释放逻辑，使用四段式 logic 结构（skillTree + buffTrees + customPipelines + customDynamicStages）。",
  logic: {
    version: 1,
    /**
     * 1) skillTree：沿用当前魔法炮技能的完整行为树（前摇/蓄力/咏唱/发动 + Switch 分支）。
     *    仅做轻度精简：初始化 magicCannon，走默认四段流程，并在发动阶段分支处理充能/释放。
     */
    skillTree: {
      name: "magic-cannon-logic",
      desc: "魔法炮技能执行行为树（基于通用模板，发动阶段分支处理充能/释放）",
      root: {
        id: 1,
        name: "Sequence",
        desc: "技能执行主流程",
        children: [
          {
            id: 1,
            name: "Let",
            desc: "初始化 magicCannon 对象（仅在第一次使用时初始化）",
            args: {
              value: { phase: 0, stacks: 0, hasGauge: false },
            },
            output: ["magicCannon"],
          },
          { id: 5, name: "RunPipeline", desc: "计算技能消耗", args: { pipelineName: "skill.cost.calculate" } },
          { id: 6, name: "RunPipeline", desc: "计算技能动作时长", args: { pipelineName: "skill.motion.calculate" } },
          {
            id: 7,
            name: "IfElse",
            desc: "前摇阶段（如果存在）",
            children: [
              { id: 8, name: "Check", args: { value: "currentSkillStartupFrames > 0" } },
              {
                id: 9,
                name: "Sequence",
                children: [
                  { id: 10, name: "RunPipeline", args: { pipelineName: "animation.startup.start" } },
                  { id: 11, name: "RunPipeline", args: { pipelineName: "event.startup.schedule" } },
                  { id: 12, name: "WaitForEvent", args: { event: "收到前摇结束通知" } },
                ],
              },
              { id: 13, name: "JustSuccess" },
            ],
          },
          {
            id: 14,
            name: "IfElse",
            desc: "蓄力阶段（如果存在）",
            children: [
              { id: 15, name: "Check", args: { value: "currentSkillChargingFrames > 0" } },
              {
                id: 16,
                name: "Sequence",
                children: [
                  { id: 17, name: "RunPipeline", args: { pipelineName: "animation.charging.start" } },
                  { id: 18, name: "RunPipeline", args: { pipelineName: "event.charging.schedule" } },
                  { id: 19, name: "WaitForEvent", args: { event: "收到蓄力结束通知" } },
                ],
              },
              { id: 20, name: "JustSuccess" },
            ],
          },
          {
            id: 21,
            name: "IfElse",
            desc: "咏唱阶段（如果存在）",
            children: [
              { id: 22, name: "Check", args: { value: "currentSkillChantingFrames > 0" } },
              {
                id: 23,
                name: "Sequence",
                children: [
                  { id: 24, name: "RunPipeline", args: { pipelineName: "animation.chanting.start" } },
                  { id: 25, name: "RunPipeline", args: { pipelineName: "event.chanting.schedule" } },
                  { id: 26, name: "WaitForEvent", args: { event: "收到咏唱结束事件" } },
                ],
              },
              { id: 27, name: "JustSuccess" },
            ],
          },
          {
            id: 27,
            name: "Sequence",
            desc: "发动阶段",
            children: [
              { id: 28, name: "RunPipeline", args: { pipelineName: "animation.action.start" } },
              { id: 29, name: "RunPipeline", args: { pipelineName: "skill.effect.apply" } },
              {
                id: 29.1,
                name: "RunPipeline",
                desc: "检查魔法炮充能 Buff 状态，获取 buffExists 变量",
                args: { pipelineName: "buff.check", params: { buffId: "magic_cannon_charge" } },
              },
              {
                id: 30,
                name: "Switch",
                desc: "根据 Buff 状态分支执行不同逻辑（充能 / 释放）",
                children: [
                  {
                    id: 31,
                    name: "Case",
                    children: [
                      { id: 32, name: "Check", args: { value: "!buffExists" } },
                      {
                        id: 33,
                        name: "Sequence",
                        desc: "充能阶段：添加 Buff，等待其他魔法技能充能",
                        children: [
                          {
                            id: 37,
                            name: "RunPipeline",
                            desc: "添加魔法炮充能 Buff",
                            args: {
                              pipelineName: "buff.add",
                              params: {
                                buffId: "magic_cannon_charge",
                                buffName: "魔法炮充能",
                                duration: -1,
                                variables: { chargeCounter: 0, initialFrame: 0 },
                              },
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    id: 37,
                    name: "Case",
                    children: [
                      { id: 38, name: "Check", args: { value: "buffExists" } },
                      {
                        id: 39,
                        name: "Sequence",
                        desc: "释放阶段：消耗充能造成伤害并移除 Buff",
                        children: [
                          {
                            id: 41,
                            name: "RunPipeline",
                            desc: "获取充能计数器（buff.check 已写入 chargeCounter）",
                            args: { pipelineName: "buff.check", params: { buffId: "magic_cannon_charge" } },
                          },
                          {
                            id: 42,
                            name: "RunPipeline",
                            desc: "请求魔法炮伤害结算（依赖 chargeCounter）",
                            args: {
                              pipelineName: "combat.damage.request",
                              params: {
                                damageFormula:
                                  "(((self.statContainer.getValue(\"atk.m\") + self.lv - target.lv) * (1 - target.statContainer.getValue(\"red.m\")) - (1 - self.statContainer.getValue(\"pip.m\")) * target.statContainer.getValue(\"def.m\")) + 700 + 10 * chargeCounter) * (300 * chargeCounter + self.statContainer.getValue(\"int\") * Math.min(chargeCounter, 5))",
                              },
                            },
                          },
                          { id: 43, name: "RunPipeline", desc: "移除充能 Buff", args: { pipelineName: "buff.remove", params: { buffId: "magic_cannon_charge" } } },
                        ],
                      },
                    ],
                  },
                  { id: 44, name: "Case", children: [{ id: 45, name: "JustSuccess" }] },
                ],
              },
              { id: 48, name: "RunPipeline", desc: "调度发动结束事件", args: { pipelineName: "event.action.schedule" } },
              { id: 49, name: "WaitForEvent", desc: "等待发动结束通知", args: { event: "收到发动结束通知" } },
            ],
          },
        ],
      },
    },

    /**
     * 2) buffTrees：魔法炮充能 Buff 的行为树
     *    - 生效时，向目标管线插入动态阶段：调用专用管线 `magic_cannon.charge_from_skill`
     *    - 结束时依赖 BuffManager 的 removeStagesBySource 清理
     */
    buffTrees: {
      magic_cannon_charge: {
        name: "magic_cannon_charge_bt",
        root: {
          id: "b1",
          name: "Sequence",
          children: [
            {
              id: "b2",
              name: "InsertDynamicStage",
              args: {
                source: "buff.magic_cannon_charge",
                targets: [
                  {
                    // 将充能逻辑插到“应用技能效果”之后（默认 skill.effect.apply 管线里只有占位阶段）
                    pipelineName: "skill.effect.apply",
                    afterStage: "应用当前技能效果",
                    priority: 100,
                    // 直接调用专用管线
                    targetPath: "",
                    expression: "",
                  },
                ],
              },
            },
          ],
        },
      },
    },

    /**
     * 3) customPipelines：自定义管线列表
     *    - 保留默认技能管线
     *    - 新增 magic_cannon.charge_from_skill：用咏唱帧数 + 表达式，写回充能
     */
    customPipelines: [
      { name: "skill.cost.calculate", stages: ["技能HP消耗计算", "技能MP消耗计算", "技能消耗扣除"] },
      { name: "skill.motion.calculate", stages: ["前摇帧数计算", "蓄力帧数计算", "咏唱帧数计算"] },
      { name: "animation.startup.start", stages: ["启动前摇动画"] },
      { name: "event.startup.schedule", stages: ["调度前摇结束事件"] },
      { name: "animation.charging.start", stages: ["启动蓄力动画"] },
      { name: "event.charging.schedule", stages: ["调度蓄力结束事件"] },
      { name: "animation.chanting.start", stages: ["启动咏唱动画"] },
      { name: "event.chanting.schedule", stages: ["调度咏唱结束事件"] },
      { name: "animation.action.start", stages: ["启动发动动画"] },
      { name: "skill.effect.apply", stages: ["应用当前技能效果"] },
      { name: "event.action.schedule", stages: ["调度发动结束事件"] },
      {
        name: "magic_cannon.charge_from_skill",
        stages: [
          "咏唱帧数计算",       // 依赖当前技能的咏唱数据
          "应用数值表达式",       // 将结果写回 buffState 或上下文（见下方 dynamicStage 定义）
        ],
        desc: "由其它技能的咏唱时间换算魔法炮充能",
      },
    ],

    /**
     * 4) customDynamicStages：自定义阶段（表达式型 T⇒T）
     *    - 用 mathjs/engine.evaluateExpression 计算新值
     *    - 写回 buffState 路径（示例：buffState.magic_cannon_charge.chargeCounter）
     *    - 这里给出一个示例公式：currentCharge + chantingFrames
     *      你可以按技能效果参考里的公式替换 expression
     */
    customDynamicStages: [
      {
        id: "magic_cannon.charge_from_skill.stage",
        kind: "expression",
        config: {
          // 可用变量映射：在 handler 中从 ctx 取值
          vars: {
            chantingFrames: "chantingFrames",
            currentCharge: "buffState.magic_cannon_charge.chargeCounter",
          },
          target: {
            type: "ctxPath",
            path: "buffState.magic_cannon_charge.chargeCounter",
            clampMin: 0,
            clampMax: 200,
          },
          // TODO: 将此表达式替换为技能效果参考中的正式公式
          expression: "clamp(currentCharge + chantingFrames, 0, 200)",
        },
      },
    ],
  },
  details:
    "logic 包含四部分：skillTree / buffTrees / customPipelines / customDynamicStages。魔法炮充能通过 buff 行为树在其他技能的发动管线后插入动态阶段，并用表达式型阶段基于咏唱帧数更新充能。",
};