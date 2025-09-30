// 帝王之光技能效果
const testSkillEffect = {
  id: "testSkillEffect",
  condition: "mainWepon.type == 'Rod' || mainWepon.type == 'Magictool'", // 启用此效果的条件
  // 可用性条件
  hpCost: "", // hp消耗表达式
  mpCost: "100", // mp消耗表达式
  castingRange: "12", // 施法距离表达式
  activeCondition: "", // 额外不可发动条件表达式
  // 行为树
  behaviorTree: {
    type: "Sequence",
    children: [
      {
        type: "Action",
        action: "Timeline.MoonGod_Phase1",
      },
      {
        type: "Selector",
        children: [
          {
            type: "Sequence",
            children: [
              { type: "Condition", condition: "input.hasDirectionKey()" },
              { type: "Action", action: "Timeline.MoonGod_Phase2" },
            ],
          },
          {
            type: "Action",
            action: "EndSkill", // 默认情况
          },
        ],
      },
    ],
  },
  // 时间线
  timeline: [
    {
      // 魔力凝聚效果
      type: "buff", // damage, buff
      target: "self", // self, target
      piplineEffects: [
        // {
        //   hook: "伤害计算管线.有效攻击力计算", // 有效atk为巫师atk
        //   fun: `(actAtk) => {
        //           有效巫师ATK = context.p.atk * 25% + context.m.Atk * 75%
        //           return 有效巫师ATK
        //         }`,
        // },
        // {
        //   hook: "伤害计算管线.距离威力计算", // 不受距离威力影响
        //   fun: `(distanceRate) => {
        //           return 100
        //         }`,
        // },
      ],
    },
    {
      type: "damage", // damage, buff
      atkType: "magic", // 造成的惯性类型：魔法、物理、一般
      expType: "magic", // 伤害惯性类型：魔法、物理、一般
      baseVale: "(p.atk + lv - target.lv) * target.red.p - target.p.def * (1 - p.pie)", // 基础值表达式，有效atk/matk、有效巫师atk、双剑atk
      expression: "(baseValue + 300 + s.lv * 10) * (500 + s.lv * 150)%", // 伤害计算表达式
    },
  ],
  // 描述
  description: "帝王之光效果",
  details: "帝王之光效果",
};
