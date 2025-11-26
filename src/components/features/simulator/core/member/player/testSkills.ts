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
  // phase: 0=未设置/已释放, 1=charging(充能中), stacks=充能百分比(0-200)
  // hasGauge: true=已使用过魔法炮（下次使用消耗700MP），false=未使用过（消耗0MP）
  // 注意：ExpressionEvaluator 不支持可选链 ?.，需要使用 != null 检查
  motionFixed: "ctx.magicCannon != null && ctx.magicCannon.phase == 1 ? 90 : 60",
  motionModified: "0",
  chantingFixed: "ctx.magicCannon != null && ctx.magicCannon.phase == 1 ? 8000 : 0",
  chantingModified: "0",
  reservoirFixed: "0",
  reservoirModified: "0",
  startupFrames: "0",
  hpCost: null,
  // 如果已使用过（hasGauge=true）且处于充能状态（phase=1），则消耗700MP；否则消耗0MP
  mpCost: "ctx.magicCannon != null && ctx.magicCannon.phase == 1 && ctx.magicCannon.hasGauge == true ? 700 : 0",
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
          id: 1,
          name: "Let",
          desc: "初始化 magicCannon 对象（仅在第一次使用时初始化）",
          args: {
            // phase: 0=未设置/已释放, 1=charging(充能中)
            // stacks: 充能百分比（0-200），通过其他魔法技能增加
            // hasGauge: true=已使用过（下次消耗700MP），false=未使用过（消耗0MP）
            // 注意：由于 ExpressionEvaluator 不支持变量存在性检查，我们总是初始化
            // 如果 magicCannon 已存在（比如在充能状态），这个初始化会覆盖它
            // 但后续的 Switch 逻辑会根据实际状态正确处理，因为充能状态会在管线中更新
            // 实际上，magicCannon 应该存储在持久化的地方（如 owner 的某个属性），
            // 而不是每次技能执行时都重新初始化。但当前架构下，我们只能这样做。
            value: { phase: 0, stacks: 0, hasGauge: false },
          },
          output: ["magicCannon"],
        },
        {
          id: 5,
          name: "RunPipeline",
          desc: "计算技能消耗",
          args: {
            pipelineName: "skill.cost.calculate",
          },
        },
        {
          id: 6,
          name: "RunPipeline",
          desc: "计算技能动作时长",
          args: {
            pipelineName: "skill.motion.calculate",
          },
        },
        {
          id: 7,
          name: "IfElse",
          desc: "前摇阶段（如果存在）",
          children: [
            {
              id: 8,
              name: "Check",
              desc: "检查是否存在前摇",
              args: {
                value: "currentSkillStartupFrames > 0",
              },
            },
            {
              id: 9,
              name: "Sequence",
              desc: "执行前摇阶段",
              children: [
                {
                  id: 10,
                  name: "RunPipeline",
                  desc: "启动前摇动画",
                  args: {
                    pipelineName: "animation.startup.start",
                  },
                },
                {
                  id: 11,
                  name: "RunPipeline",
                  desc: "调度前摇结束事件",
                  args: {
                    pipelineName: "event.startup.schedule",
                  },
                },
                {
                  id: 12,
                  name: "WaitForEvent",
                  desc: "等待前摇结束通知",
                  args: {
                    event: "收到前摇结束通知",
                  },
                },
              ],
            },
            {
              id: 13,
              name: "JustSuccess",
              desc: "跳过前摇阶段",
            },
          ],
        },
        {
          id: 14,
          name: "IfElse",
          desc: "蓄力阶段（如果存在）",
          children: [
            {
              id: 15,
              name: "Check",
              desc: "检查是否存在蓄力",
              args: {
                value: "currentSkillChargingFrames > 0",
              },
            },
            {
              id: 16,
              name: "Sequence",
              desc: "执行蓄力阶段",
              children: [
                {
                  id: 17,
                  name: "RunPipeline",
                  desc: "启动蓄力动画",
                  args: {
                    pipelineName: "animation.charging.start",
                  },
                },
                {
                  id: 18,
                  name: "RunPipeline",
                  desc: "调度蓄力结束事件",
                  args: {
                    pipelineName: "event.charging.schedule",
                  },
                },
                {
                  id: 19,
                  name: "WaitForEvent",
                  desc: "等待蓄力结束通知",
                  args: {
                    event: "收到蓄力结束通知",
                  },
                },
              ],
            },
            {
              id: 20,
              name: "JustSuccess",
              desc: "跳过蓄力阶段",
            },
          ],
        },
        {
          id: 21,
          name: "IfElse",
          desc: "咏唱阶段（如果存在）",
          children: [
            {
              id: 22,
              name: "Check",
              desc: "检查是否存在咏唱",
              args: {
                value: "currentSkillChantingFrames > 0",
              },
            },
            {
              id: 23,
              name: "Sequence",
              desc: "执行咏唱阶段",
              children: [
                {
                  id: 24,
                  name: "RunPipeline",
                  desc: "启动咏唱动画",
                  args: {
                    pipelineName: "animation.chanting.start",
                  },
                },
                {
                  id: 25,
                  name: "RunPipeline",
                  desc: "调度咏唱结束事件",
                  args: {
                    pipelineName: "event.chanting.schedule",
                  },
                },
                {
                  id: 26,
                  name: "WaitForEvent",
                  desc: "等待咏唱结束事件",
                  args: {
                    event: "收到咏唱结束事件",
                  },
                },
              ],
            },
            {
              id: 27,
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
              id: 29,
              name: "Sequence",
              desc: "调试：显示当前 magicCannon 状态和充能百分比",
              children: [
                {
                  id: 293,
                  name: "Calculate",
                  args: {
                    // 注意：ExpressionEvaluator 不支持 null 字面量，使用 truthy 检查
                    value: "magicCannon ? (magicCannon.phase ? magicCannon.phase : 0) : 0",
                  },
                  output: ["currentPhase"],
                },
                {
                  id: 294,
                  name: "Log",
                  args: {
                    message: "Switch 前：当前 phase 值（0=未设置, 1=充能中）",
                    level: "log",
                  },
                  input: ["currentPhase"],
                },
                {
                  id: 295,
                  name: "Calculate",
                  args: {
                    value: "magicCannon && magicCannon.stacks ? magicCannon.stacks : 0",
                  },
                  output: ["currentStacks"],
                },
                {
                  id: 296,
                  name: "Log",
                  args: {
                    message: "当前充能百分比（stacks，上限200）",
                    level: "log",
                  },
                  input: ["currentStacks"],
                },
              ],
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
                        // phase == 0 或未设置 表示需要充能（第一次使用，充能）
                        // 注意：ExpressionEvaluator 不支持 null 字面量，使用 truthy 检查
                        // !magicCannon 表示未初始化，magicCannon.phase == 0 表示已初始化但未充能
                        value: "!magicCannon || (magicCannon.phase == 0)",
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
                          name: "Sequence",
                          desc: "进入充能状态并记录充能百分比变化",
                          children: [
                            {
                              id: 351,
                              name: "Calculate",
                              args: {
                                // 获取旧的充能百分比
                                value: "magicCannon && magicCannon.stacks ? magicCannon.stacks : 0",
                              },
                              output: ["oldStacks"],
                            },
                            {
                              id: 352,
                              name: "Let",
                              desc: "进入充能状态（phase=1, hasGauge=true, stacks=0）",
                              args: {
                                // 充能阶段：第一次使用魔法炮，进入充能状态
                                // phase=1: 充能中（等待其他魔法技能增加充能百分比）
                                // hasGauge=true: 标记已使用过，下次使用消耗700MP
                                // stacks=0: 充能百分比初始为0，上限200，通过其他魔法技能增加
                                // 注意：充能百分比会在管线中自动增长，或通过其他魔法技能增加
                                value: { phase: 1, stacks: 0, hasGauge: true },
                              },
                              output: ["magicCannon"],
                            },
                            {
                              id: 353,
                              name: "Calculate",
                              args: {
                                // 计算充能百分比变化（新值 - 旧值）
                                value: "0 - oldStacks",
                              },
                              output: ["stacksChange"],
                            },
                            {
                              id: 354,
                              name: "Log",
                              args: {
                                message: "🔋 魔法炮充能计数器变化",
                                level: "log",
                              },
                            },
                            {
                              id: 355,
                              name: "Log",
                              args: {
                                message: "  旧值：",
                                level: "log",
                              },
                              input: ["oldStacks"],
                            },
                            {
                              id: 356,
                              name: "Calculate",
                              args: {
                                value: "0",
                              },
                              output: ["newStacks"],
                            },
                            {
                              id: 357,
                              name: "Log",
                              args: {
                                message: "  新值：",
                                level: "log",
                              },
                              input: ["newStacks"],
                            },
                            {
                              id: 358,
                              name: "Log",
                              args: {
                                message: "  变化量：",
                                level: "log",
                              },
                              input: ["stacksChange"],
                            },
                          ],
                        },
                        {
                          id: 36,
                          name: "Log",
                          args: {
                            message: "魔法炮进入充能状态（充能百分比将通过其他魔法技能增加，上限200）",
                            level: "log",
                          },
                        },
                        {
                          id: 37,
                          name: "Sequence",
                          desc: "调试：显示充能后的 magicCannon 状态和充能百分比",
                          children: [
                            {
                              id: 371,
                              name: "Calculate",
                              args: {
                                value: "magicCannon ? magicCannon.phase : -1",
                              },
                              output: ["phaseAfterCharge"],
                            },
                            {
                              id: 372,
                              name: "Log",
                              args: {
                                message: "充能后 magicCannon.phase",
                                level: "log",
                              },
                              input: ["phaseAfterCharge"],
                            },
                            {
                              id: 373,
                              name: "Calculate",
                              args: {
                                value: "magicCannon && magicCannon.stacks ? magicCannon.stacks : 0",
                              },
                              output: ["stacksAfterCharge"],
                            },
                            {
                              id: 374,
                              name: "Log",
                              args: {
                                message: "🔋 当前充能百分比（stacks，上限200）",
                                level: "log",
                              },
                              input: ["stacksAfterCharge"],
                            },
                          ],
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
                        // phase == 1 表示已充能，进入释放阶段（第二次使用，释放伤害）
                        // 注意：ExpressionEvaluator 不支持 null 字面量，使用 truthy 检查
                        value: "magicCannon && magicCannon.phase == 1",
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
                            message: "魔法炮释放阶段：消耗充能造成伤害",
                            level: "log",
                          },
                        },
                        {
                          id: 41,
                          name: "Calculate",
                          args: {
                            // 计算伤害：(matkEff + 700 + 10 * stacks) * (300 * stacks + baseInt * min(stacks, 5))
                            // Math.min(a, b) 替换为 a < b ? a : b
                            // 注意：ExpressionEvaluator 不支持 null 字面量，使用 truthy 检查
                            // stacks = magicCannon && magicCannon.stacks ? magicCannon.stacks : 0（充能百分比，0-200）
                            // minStacks = stacks < 5 ? stacks : 5
                            value: "(matkEff + 700 + 10 * (magicCannon && magicCannon.stacks ? magicCannon.stacks : 0)) * (300 * (magicCannon && magicCannon.stacks ? magicCannon.stacks : 0) + baseInt * (magicCannon && magicCannon.stacks ? (magicCannon.stacks < 5 ? magicCannon.stacks : 5) : 0))",
                          },
                          output: ["damage"],
                        },
                        {
                          id: 44,
                          name: "Let",
                          desc: "释放后重置 magicCannon（清空充能状态）",
                          args: {
                            // 释放后重置：phase=0（未设置），stacks=0（清空充能百分比），hasGauge=false（下次使用消耗0MP）
                            // 下次使用魔法炮时，会重新进入充能状态
                            value: { phase: 0, stacks: 0, hasGauge: false },
                          },
                          output: ["magicCannon"],
                        },
                        {
                          id: 42,
                          name: "Log",
                          args: {
                            message: "计算伤害完成，伤害值",
                            level: "log",
                          },
                          input: ["damage"],
                        },
                        {
                          id: 43,
                          name: "Sequence",
                          desc: "调试：显示释放时的充能百分比",
                          children: [
                            {
                              id: 431,
                              name: "Calculate",
                              args: {
                                value: "magicCannon && magicCannon.stacks ? magicCannon.stacks : 0",
                              },
                              output: ["stacksOnRelease"],
                            },
                            {
                              id: 432,
                              name: "Log",
                              args: {
                                message: "释放时充能百分比（stacks）",
                                level: "log",
                              },
                              input: ["stacksOnRelease"],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 44,
                  name: "Case",
                  children: [
                    {
                      id: 45,
                      name: "JustSuccess",
                      desc: "默认分支条件（总是成功）",
                    },
                    {
                      id: 46,
                      name: "Sequence",
                      desc: "默认分支：phase 未设置或为 0，进入充能状态",
                      children: [
                        {
                          id: 461,
                          name: "Log",
                          args: {
                            message: "魔法炮：首次使用，进入充能状态",
                            level: "log",
                          },
                        },
                        {
                          id: 462,
                          name: "Let",
                          desc: "进入充能状态",
                          args: {
                            // 首次使用：进入充能状态
                            value: { phase: 1, stacks: 0, hasGauge: true },
                          },
                          output: ["magicCannon"],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 48,
              name: "RunPipeline",
              desc: "调度发动结束事件",
              args: {
                pipelineName: "event.action.schedule",
              },
            },
            {
              id: 49,
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
  details: "logic 字段包含完整的行为树 JSON，使用 Switch 根据 magicCannon.phase (0=未设置, 1=charge, 2=release) 分支执行逻辑。",
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
