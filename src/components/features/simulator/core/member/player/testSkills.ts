import type { skill, skill_effect } from "@db/generated/zod";

/**
 * 魔法炮（测试用技能）
 *
 * 约定：
 * - 同一 skill_effect 中通过 logic.phase 切换充能/释放阶段
 * - 状态机需要在施放时写入 context.magicCannon.phase = 'charge' | 'release'
 * - gauge、层数等运行时数据保存在 PlayerStateContext（例如 magicCannonGauge）
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

export const magicCannonSkillEffect: skill_effect = {
  id: "test.magic_cannon.skill_effect",
  belongToskillId: magicCannonSkill.id,
  condition: "true",
  elementLogic: "return ctx.elementOverride ?? 'Light';",
  castingRange: "10m",
  effectiveRange: 10,
  motionFixed: "ctx.magicCannon.phase === 'charge' ? 90 : 60",
  motionModified: "0",
  chantingFixed: "ctx.magicCannon.phase === 'charge' ? 8000 : 0",
  chantingModified: "0",
  reservoirFixed: "0",
  reservoirModified: "0",
  startupFrames: "ctx.magicCannon.phase === 'release' ? 30 : 0",
  hpCost: null,
  mpCost: "ctx.magicCannon.phase === 'charge' && ctx.magicCannon.hasGauge ? 700 : 0",
  description: "魔法炮充能/释放逻辑，依赖 context.magicCannon 中的运行时状态。",
  logic: {
    type: "magicCannon",
    gaugeId: "magic_cannon_gauge",
    phases: {
      charge: {
        autoFill: [
          { until: 100, intervalMs: 1000, deltaPercent: 1 },
          { from: 100, intervalMs: 2000, deltaPercent: 1 },
        ],
        contributors: [
          {
            skillIds: [
              "skill.magic_arrow",
              "skill.magic_lance",
              "skill.magic_storm",
              "skill.magic_burst",
            ],
            formula: "(castMs / 1000 + cspdBonus) * layerFactor",
          },
          {
            skillIds: ["skill.magic_charge"],
            formula: "baseFormula + (afterMagicCharge ? 40 * cspdBonus : 0)",
          },
        ],
        maxGaugePercent: 200,
        onEnter: [
          { action: "ensureGauge", gaugeId: "magic_cannon_gauge" },
          {
            action: "ensureBuff",
            buffId: "buff.magic_cannon_tracker",
            durationMs: 60000,
            data: {
              decayAfterMs: 12000,
              decayIntervalMs: 6000,
              decayPercent: 1,
            },
          },
        ],
        onDamageTaken: {
          action: "maybeLoseGauge",
          losePercent: 20,
        },
      },
      release: {
        requirementPercent: 20,
        consumeGauge: true,
        damageFormula:
          "(matkEff + 700 + 10 * chantStacks) * (300 * chantStacks + baseInt * Math.min(chantStacks, 5))",
        overloadBonus: {
          condition: "percent > 100",
          blockPenetrationBonus: "percent - 100",
        },
        onCast: [
          { action: "ensureMpCost", value: 700, onlyWhenGaugePaid: false },
          { action: "spawnProjectile", speed: 25, radius: 1.5, element: "Light" },
        ],
      },
    },
  },
  details:
    "logic.phases.charge/rls 供状态机调用：phase 由 context.magicCannon.phase 控制，" +
    "gauge 数据在 PlayerStateContext 中维护。",
};

export const testSkills = {
  magicCannonSkill,
  magicCannonSkillEffect,
};

