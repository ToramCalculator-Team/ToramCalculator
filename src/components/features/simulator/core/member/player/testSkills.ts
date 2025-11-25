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
  id: "test.magic_cannon.skill",
  treeType: "MagicSkill",
  posX: 3,
  posY: 2,
  tier: 4,
  name: "魔法炮（测试）",
  isPassive: false,
  chargingType: "Reservoir",
  distanceType: "Long",
  targetType: "Enemy",
  details: "测试用魔法炮，包含充能与释放两个阶段。",
  dataSources: "core/member/player/testSkills.ts",
  statisticId: "stat.skill.magic_cannon.test",
  updatedByAccountId: null,
  createdByAccountId: null,
};

/**
 * 魔法炮技能效果 - 使用行为树 JSON
 * logic 字段存储完整的行为树定义
 */
export const magicCannonSkillEffect: skill_effect = {
  id: "test.magic_cannon.skill_effect",
  belongToskillId: magicCannonSkill.id,
  condition: "true",
  elementLogic: "return ctx.elementOverride ?? 'Light';",
  castingRange: "10m",
  effectiveRange: 10,
  motionFixed: "ctx.magicCannon?.phase === 'charge' ? 90 : 60",
  motionModified: "0",
  chantingFixed: "ctx.magicCannon?.phase === 'charge' ? 8000 : 0",
  chantingModified: "0",
  reservoirFixed: "0",
  reservoirModified: "0",
  startupFrames: "ctx.magicCannon?.phase === 'release' ? 30 : 0",
  hpCost: null,
  mpCost: "ctx.magicCannon?.phase === 'charge' && ctx.magicCannon?.hasGauge ? 700 : 0",
  description: "魔法炮充能/释放逻辑，通过行为树实现。",
  logic: {
    name: "magic-cannon-logic",
    desc: "魔法炮技能逻辑行为树",
    root: {
      id: 1,
      name: "Switch",
      desc: "根据 phase 分支",
      children: [
        {
          id: 2,
          name: "Case",
          children: [
            {
              id: 3,
              name: "Check",
              args: {
                value: "magicCannon?.phase === 'charge'",
              },
            },
            {
              id: 4,
              name: "Sequence",
              desc: "充能阶段",
              children: [
                {
                  id: 5,
                  name: "Log",
                  args: {
                    message: "魔法炮充能阶段开始",
                    level: "log",
                  },
                },
                {
                  id: 6,
                  name: "SetField",
                  args: {
                    field: "magicCannon.phase",
                    value: "charge",
                  },
                },
                {
                  id: 7,
                  name: "Log",
                  args: {
                    message: "充能完成，准备释放",
                    level: "log",
                  },
                },
              ],
            },
          ],
        },
        {
          id: 8,
          name: "Case",
          children: [
            {
              id: 9,
              name: "Check",
              args: {
                value: "magicCannon?.phase === 'release'",
              },
            },
            {
              id: 10,
              name: "Sequence",
              desc: "释放阶段",
              children: [
                {
                  id: 11,
                  name: "Log",
                  args: {
                    message: "魔法炮释放阶段开始",
                    level: "log",
                  },
                },
                {
                  id: 12,
                  name: "Calculate",
                  args: {
                    value: "(matkEff + 700 + 10 * (magicCannon?.stacks ?? 0)) * (300 * (magicCannon?.stacks ?? 0) + baseInt * Math.min(magicCannon?.stacks ?? 0, 5))",
                  },
                  output: ["damage"],
                },
                {
                  id: 13,
                  name: "Log",
                  args: {
                    message: "计算伤害完成",
                    level: "log",
                  },
                  input: ["damage"],
                },
                {
                  id: 14,
                  name: "ScheduleFSMEvent",
                  args: {
                    eventType: "收到发动结束通知",
                    delayFrames: 0,
                  },
                },
              ],
            },
          ],
        },
        {
          id: 15,
          name: "Case",
          children: [
            {
              id: 16,
              name: "AlwaysSuccess",
              children: [
                {
                  id: 17,
                  name: "Log",
                  args: {
                    message: "魔法炮：phase 未设置，使用默认逻辑",
                    level: "warn",
                  },
                },
                {
                  id: 18,
                  name: "ScheduleFSMEvent",
                  args: {
                    eventType: "收到发动结束通知",
                    delayFrames: 0,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  } as any,
  details: "logic 字段包含完整的行为树 JSON，使用 Switch 根据 magicCannon.phase 分支执行充能或释放逻辑。",
};

export const testSkills = {
  magicCannonSkill,
  magicCannonSkillEffect,
};
