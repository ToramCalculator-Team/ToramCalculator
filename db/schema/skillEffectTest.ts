const skillEffectTest = {
    id:'djalsdjaisdjasu',
    condition: "mainWepon.type == 'Rod' || mainWepon.type == 'Magictool'",
    // 可用性条件
    hpCost: '', // hp消耗表达式
    mpCost: '100',// mp消耗表达式
    castingRange: '12', // 施法距离表达式
    disbleCondition: '', // 额外不可发动条件表达式
    // 动画数据
    motionFixed: '13', // 固定动画帧数
    motionModified: '48', // 可加速动画帧数
    chantingFixed: '0', // 固定咏唱时间
    chantingModified: '0', // 可加速咏唱时间
    reservoirFixed: '0', // 固定蓄力时间
    reservoirModified: '0', // 可加速蓄力时间
    startupProportion: 0.5,    // 前摇比例
    // 效果数据
    controlType: 'None', // 控制类型
    effectScopeFun: `function(caster, target, skillLv) = {
        // 以目标为中心，半径12m的圆
    }`, // 效果范围计算函数
    damageExpression: '有效巫師ATK+100*150%', // 伤害计算表达式
    buffEffectHook: '', // buff效果钩子
    buffEffectFun: '', // buff效果函数
    // 描述
    description: '测试技能效果',
    details: '测试技能效果',
}