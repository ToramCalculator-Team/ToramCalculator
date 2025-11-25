import type { skill, skill_effect } from "@db/generated/zod";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { createId } from "@paralleldrive/cuid2";

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
    desc: "魔法炮技能执行行为树（基于通用模板，在发动阶段使用 Switch 分支）",
    root: {
      id: 1,
      name: "Sequence",
      desc: "技能执行主流程",
      children: [
        {
          id: 2,
          name: "RunPipeline",
          desc: "计算技能消耗",
          args: {
            pipelineName: "skill.cost.calculate",
          },
        },
        {
          id: 4,
          name: "RunPipeline",
          desc: "计算技能动作时长",
          args: {
            pipelineName: "skill.motion.calculate",
          },
        },
        {
          id: 6,
          name: "IfElse",
          desc: "前摇阶段（如果存在）",
          children: [
            {
              id: 7,
              name: "Check",
              desc: "检查是否存在前摇",
              args: {
                value: "currentSkillStartupFrames > 0",
              },
            },
            {
              id: 8,
              name: "Sequence",
              desc: "执行前摇阶段",
              children: [
                {
                  id: 9,
                  name: "RunPipeline",
                  desc: "启动前摇动画",
                  args: {
                    pipelineName: "animation.startup.start",
                  },
                },
                {
                  id: 10,
                  name: "RunPipeline",
                  desc: "调度前摇结束事件",
                  args: {
                    pipelineName: "event.startup.schedule",
                  },
                },
                {
                  id: 11,
                  name: "WaitForEvent",
                  desc: "等待前摇结束通知",
                  args: {
                    event: "收到前摇结束通知",
                  },
                },
              ],
            },
            {
              id: 12,
              name: "JustSuccess",
              desc: "跳过前摇阶段",
            },
          ],
        },
        {
          id: 13,
          name: "IfElse",
          desc: "蓄力阶段（如果存在）",
          children: [
            {
              id: 14,
              name: "Check",
              desc: "检查是否存在蓄力",
              args: {
                value: "currentSkillChargingFrames > 0",
              },
            },
            {
              id: 15,
              name: "Sequence",
              desc: "执行蓄力阶段",
              children: [
                {
                  id: 16,
                  name: "RunPipeline",
                  desc: "启动蓄力动画",
                  args: {
                    pipelineName: "animation.charging.start",
                  },
                },
                {
                  id: 17,
                  name: "RunPipeline",
                  desc: "调度蓄力结束事件",
                  args: {
                    pipelineName: "event.charging.schedule",
                  },
                },
                {
                  id: 18,
                  name: "WaitForEvent",
                  desc: "等待蓄力结束通知",
                  args: {
                    event: "收到蓄力结束通知",
                  },
                },
              ],
            },
            {
              id: 19,
              name: "JustSuccess",
              desc: "跳过蓄力阶段",
            },
          ],
        },
        {
          id: 20,
          name: "IfElse",
          desc: "咏唱阶段（如果存在）",
          children: [
            {
              id: 21,
              name: "Check",
              desc: "检查是否存在咏唱",
              args: {
                value: "currentSkillChantingFrames > 0",
              },
            },
            {
              id: 22,
              name: "Sequence",
              desc: "执行咏唱阶段",
              children: [
                {
                  id: 23,
                  name: "RunPipeline",
                  desc: "启动咏唱动画",
                  args: {
                    pipelineName: "animation.chanting.start",
                  },
                },
                {
                  id: 24,
                  name: "RunPipeline",
                  desc: "调度咏唱结束事件",
                  args: {
                    pipelineName: "event.chanting.schedule",
                  },
                },
                {
                  id: 25,
                  name: "WaitForEvent",
                  desc: "等待咏唱结束通知",
                  args: {
                    event: "收到咏唱结束通知",
                  },
                },
              ],
            },
            {
              id: 26,
              name: "JustSuccess",
              desc: "跳过咏唱阶段",
            },
          ],
        },
        {
          id: 27,
          name: "Sequence",
          desc: "发动阶段",
          children: [
            {
              id: 28,
              name: "RunPipeline",
              desc: "启动发动动画",
              args: {
                pipelineName: "animation.action.start",
              },
            },
            {
              id: 29,
              name: "RunPipeline",
              desc: "应用技能效果",
              args: {
                pipelineName: "skill.effect.apply",
              },
            },
            {
              id: 30,
              name: "Switch",
              desc: "根据 phase 分支执行不同逻辑",
              children: [
                {
                  id: 31,
                  name: "Case",
                  children: [
                    {
                      id: 32,
                      name: "Check",
                      args: {
                        value: "magicCannon?.phase === 'charge'",
                      },
                    },
                    {
                      id: 33,
                      name: "Sequence",
                      desc: "充能阶段逻辑",
                      children: [
                        {
                          id: 34,
                          name: "Log",
                          args: {
                            message: "魔法炮充能阶段开始",
                            level: "log",
                          },
                        },
                        {
                          id: 35,
                          name: "SetField",
                          args: {
                            field: "magicCannon.phase",
                            value: "charge",
                          },
                        },
                        {
                          id: 36,
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
                  id: 37,
                  name: "Case",
                  children: [
                    {
                      id: 38,
                      name: "Check",
                      args: {
                        value: "magicCannon?.phase === 'release'",
                      },
                    },
                    {
                      id: 39,
                      name: "Sequence",
                      desc: "释放阶段逻辑",
                      children: [
                        {
                          id: 40,
                          name: "Log",
                          args: {
                            message: "魔法炮释放阶段开始",
                            level: "log",
                          },
                        },
                        {
                          id: 41,
                          name: "Calculate",
                          args: {
                            value: "(matkEff + 700 + 10 * (magicCannon?.stacks ?? 0)) * (300 * (magicCannon?.stacks ?? 0) + baseInt * Math.min(magicCannon?.stacks ?? 0, 5))",
                          },
                          output: ["damage"],
                        },
                        {
                          id: 42,
                          name: "Log",
                          args: {
                            message: "计算伤害完成",
                            level: "log",
                          },
                          input: ["damage"],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 43,
                  name: "Case",
                  children: [
                    {
                      id: 44,
                      name: "AlwaysSuccess",
                      children: [
                        {
                          id: 45,
                          name: "Log",
                          args: {
                            message: "魔法炮：phase 未设置，使用默认逻辑",
                            level: "warn",
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 46,
              name: "RunPipeline",
              desc: "调度发动结束事件",
              args: {
                pipelineName: "event.action.schedule",
              },
            },
            {
              id: 47,
              name: "WaitForEvent",
              desc: "等待发动结束通知",
              args: {
                event: "收到发动结束通知",
              },
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

/**
 * 创建测试技能数据（CharacterSkillWithRelations 格式）
 * 用于在 PlayerStateMachine 初始化时注入测试技能
 */
export function createTestSkillData(): CharacterSkillWithRelations {
  return {
    id: createId(),
    lv: 1,
    isStarGem: false,
    templateId: magicCannonSkill.id,
    belongToCharacterId: "",
    template: {
      ...magicCannonSkill,
      effects: [magicCannonSkillEffect],
    },
  } as CharacterSkillWithRelations;
}
