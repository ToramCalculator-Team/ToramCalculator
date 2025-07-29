# 用Blockly实现复杂游戏技能逻辑的设计方案

## 核心理念
通过设计游戏领域特定的Blockly块，让非程序员用户能够直观地构建复杂的技能逻辑。

## 游戏专用块设计

### 1. 技能状态管理块

```javascript
// 技能状态块
{
  "type": "skill_state",
  "message0": "设置技能 %1 状态为 %2",
  "args0": [
    {"type": "input_value", "name": "SKILL_NAME"},
    {"type": "field_dropdown", "name": "STATE", "options": [
      ["充填中", "charging"],
      ["准备发射", "ready"],
      ["发射中", "firing"],
      ["冷却中", "cooldown"]
    ]}
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 120
}

// 获取技能状态块
{
  "type": "get_skill_state", 
  "message0": "技能 %1 的状态",
  "args0": [{"type": "input_value", "name": "SKILL_NAME"}],
  "output": "String",
  "colour": 120
}
```

### 2. 计时器/计数器块

```javascript
// 创建计时器块
{
  "type": "create_timer",
  "message0": "每 %1 秒执行 %2",
  "args0": [
    {"type": "field_number", "name": "INTERVAL", "value": 1},
    {"type": "input_statement", "name": "ACTIONS"}
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 65
}

// 计数器块
{
  "type": "counter",
  "message0": "计数器 %1 %2 %3",
  "args0": [
    {"type": "input_value", "name": "COUNTER_NAME"},
    {"type": "field_dropdown", "name": "OPERATION", "options": [
      ["增加", "add"],
      ["减少", "subtract"],
      ["设置为", "set"]
    ]},
    {"type": "input_value", "name": "VALUE"}
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 65
}
```

### 3. 游戏事件监听块

```javascript
// 事件监听块
{
  "type": "event_listener",
  "message0": "当 %1 时执行 %2",
  "args0": [
    {"type": "field_dropdown", "name": "EVENT", "options": [
      ["技能被再次使用", "skill_recast"],
      ["角色受到伤害", "damage_taken"],
      ["魔法技能释放", "magic_skill_cast"],
      ["咏唱完成", "chanting_complete"]
    ]},
    {"type": "input_statement", "name": "ACTIONS"}
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 20
}

// 条件事件块
{
  "type": "conditional_event",
  "message0": "当 %1 且 %2 时执行 %3",
  "args0": [
    {"type": "field_dropdown", "name": "EVENT", "options": [
      ["技能被再次使用", "skill_recast"],
      ["受到伤害", "damage_taken"]
    ]},
    {"type": "input_value", "name": "CONDITION", "check": "Boolean"},
    {"type": "input_statement", "name": "ACTIONS"}
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 20
}
```

### 4. 游戏效果块

```javascript
// 伤害效果块
{
  "type": "damage_effect",
  "message0": "对 %1 造成 %2 伤害",
  "args0": [
    {"type": "field_dropdown", "name": "TARGET", "options": [
      ["当前目标", "current_target"],
      ["所有敌人", "all_enemies"],
      ["自己", "self"]
    ]},
    {"type": "input_value", "name": "DAMAGE_AMOUNT", "check": "Number"}
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 0
}

// Buff/Debuff块
{
  "type": "apply_buff",
  "message0": "给 %1 添加 %2 效果，持续 %3 秒",
  "args0": [
    {"type": "field_dropdown", "name": "TARGET", "options": [
      ["自己", "self"],
      ["当前目标", "current_target"]
    ]},
    {"type": "input_value", "name": "BUFF_NAME"},
    {"type": "input_value", "name": "DURATION", "check": "Number"}
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 160
}
```

### 5. 游戏属性和计算块

```javascript
// 角色属性块
{
  "type": "character_attribute",
  "message0": "%1 的 %2",
  "args0": [
    {"type": "field_dropdown", "name": "TARGET", "options": [
      ["自己", "self"],
      ["目标", "target"]
    ]},
    {"type": "field_dropdown", "name": "ATTRIBUTE", "options": [
      ["生命值", "hp"],
      ["魔法值", "mp"],
      ["基础智力", "base_int"],
      ["咏唱速度", "chanting_speed"]
    ]}
  ],
  "output": "Number",
  "colour": 230
}

// 百分比计算块
{
  "type": "percentage_calc",
  "message0": "%1 的 %2 %",
  "args0": [
    {"type": "input_value", "name": "BASE_VALUE", "check": "Number"},
    {"type": "input_value", "name": "PERCENTAGE", "check": "Number"}
  ],
  "output": "Number",
  "colour": 230
}
```

## 魔法炮技能的Blockly实现示例

### 可视化表示：

```
[当技能被使用时]
    └─[如果 技能状态 == "未充填"]
        ├─[设置技能状态为 "充填中"]
        ├─[设置 充填百分比 为 0]
        ├─[添加Buff "魔炮充填"]
        └─[创建计时器 每1秒执行]
            └─[如果 充填百分比 < 100]
                ├─[计数器 充填百分比 增加 1]
                └─[否则]
                    └─[计数器 充填百分比 增加 0.5]
    
    └─[否则如果 技能状态 == "充填中"]
        ├─[设置技能状态为 "发射"]
        ├─[移除Buff "魔炮充填"]
        └─[如果 充填百分比 < 100]
            ├─[计算 基础伤害 = 600 + 基础智力 × 5]
            └─[对目标造成 基础伤害 × 充填百分比% 伤害]
            └─[否则]
                └─[执行多段伤害计算]

[当魔法技能释放时]
    └─[如果 技能状态 == "充填中"]
        └─[计数器 充填百分比 增加 咏唱加速计算结果]
```

## 自定义代码生成器

```javascript
// 自定义生成器，输出游戏事件而非JavaScript
Blockly.GameLogic = new Blockly.Generator('GameLogic');

Blockly.GameLogic['skill_state'] = function(block) {
  const skillName = Blockly.GameLogic.valueToCode(block, 'SKILL_NAME', Blockly.GameLogic.ORDER_ATOMIC);
  const state = block.getFieldValue('STATE');
  
  return {
    type: 'set_skill_state',
    skill: skillName,
    state: state
  };
};

Blockly.GameLogic['create_timer'] = function(block) {
  const interval = block.getFieldValue('INTERVAL');
  const actions = Blockly.GameLogic.statementToCode(block, 'ACTIONS');
  
  return {
    type: 'create_timer',
    interval: parseFloat(interval) * 1000, // 转换为毫秒
    actions: actions
  };
};

// ... 其他块的生成器
```

## 执行引擎集成

```javascript
class SkillExecutionEngine {
  execute(skillDefinition, context) {
    switch(skillDefinition.type) {
      case 'set_skill_state':
        context.setSkillState(skillDefinition.skill, skillDefinition.state);
        break;
        
      case 'create_timer':
        context.createTimer(skillDefinition.interval, () => {
          this.executeActions(skillDefinition.actions, context);
        });
        break;
        
      case 'damage_effect':
        const damage = this.calculateValue(skillDefinition.damage, context);
        context.applyDamage(skillDefinition.target, damage);
        break;
        
      // ... 其他类型的处理
    }
  }
}
```

## 优势分析

1. **直观性**: 用户通过拖拽游戏概念块来构建逻辑
2. **类型安全**: Blockly的连接检查防止类型错误  
3. **渐进学习**: 用户可以从简单块开始，逐步掌握复杂逻辑
4. **可扩展性**: 随时可以添加新的游戏概念块
5. **调试友好**: 可视化结构便于理解和调试

## 实施建议

1. **从核心块开始**: 先实现状态、计时器、事件、基础效果
2. **提供模板**: 为常见技能模式提供预设模板
3. **分层复杂度**: 基础块 → 组合块 → 高级模板
4. **用户引导**: 提供交互式教程和示例 