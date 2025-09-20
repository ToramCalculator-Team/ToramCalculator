import { expression } from "mathjs";

const testSkillEffect = {
  id: "testSkillEffect",
  condition: "mainWepon.type == 'Rod' || mainWepon.type == 'Magictool'", // 启用此效果的条件
  // 可用性条件
  hpCost: "", // hp消耗表达式
  mpCost: "100", // mp消耗表达式
  castingRange: "12", // 施法距离表达式
  disbleCondition: "", // 额外不可发动条件表达式
  // 时间线
  timeline: [
    {
      type: "buff", // damage, buff
      piplineEffects: [
        {
          hook: "伤害计算管线.有效攻击力计算", // buff效果钩子
          fun: `(actAtk) => {
                  有效巫师ATK = context.p.atk * 25% + context.m.Atk * 75%
                  return 有效巫师ATK
                }`,
        },
        {
          hook: "伤害计算管线.距离威力计算", // buff效果钩子
          fun: `(distanceRate) => {
                  return 100
                }`,
        },
      ],
    },
    {
      type: "damage", // damage, buff
      expression: "有效巫師ATK+100*150%", // 伤害计算表达式
    },
  ],
  // 效果数据
  effectScope: {
    // 基础信息
    type: "dynamic", // 'static' | 'dynamic'
    duration: 3000, // 持续时间（ms）
    updateInterval: 16, // 更新间隔（ms）

    // 形状定义（结构化JSON）
    shape: {
      type: "annulus", // circle, sector, rectangle, annulus, rectangle
      operations: [
        {
          type: "move",
          shape: {
            type: "circle",
            center: { type: "caster_position" },
            radius: { type: "constant", value: 3 },
          },
          motion: {
            type: "linear",
            start: { type: "caster_position" },
            end: { type: "target_position" },
            speed: 12, // m/s
            duration: { type: "auto" }, // 自动计算
          },
        },
      ],
    },
  }, // 效果范围计算函数
  damageExpression: "有效巫師ATK+100*150%", // 伤害计算表达式
  buffEffectHook: "", // buff效果钩子
  buffEffectFun: "", // buff效果函数
  // 描述
  description: "测试技能效果",
  details: "测试技能效果",
};
