# 🧠 JS表达式解析器

## 概述

JS表达式解析器提供了安全的JavaScript代码验证、转换和执行功能，专门为Toram Calculator的技能系统和装备属性系统设计。

## 核心特性

### ✅ **代码验证**
- 语法正确性检查
- 安全性检查（屏蔽危险操作）
- 沙盒兼容性验证

### 🔄 **数据操作转换**
- 自动识别数据操作模式
- 转换为ReactiveSystem调用
- 支持百分比修饰符

### 🛡️ **安全执行**
- 沙盒环境执行
- 危险对象屏蔽
- 上下文隔离

## 使用示例

### 基础验证

```typescript
import JSExpressionProcessor from './JSExpressionProcessor';

const processor = new JSExpressionProcessor();

// 验证代码安全性
const validation = processor.validate("self.hp + 10%");
console.log(validation.isValid); // true
console.log(validation.warnings); // ["建议添加return语句"]
```

### 数据操作转换

```typescript
// 输入: 装备属性表达式
const equipmentBonus = "self.mAtk + 15%";

// 转换
const result = processor.transform(equipmentBonus);
console.log(result.transformedCode);
// 输出: "ctx.reactiveSystem.addModifier('mAtk', 'percentage', 15, {...})"

console.log(result.dataOperations);
// [{ type: 'modifier', target: 'mAtk', operation: 'add', value: 15 }]
```

### 完整集成使用

```typescript
import JSExpressionIntegration from './JSExpressionIntegration';

const integration = new JSExpressionIntegration({
  enableTransformation: true,
  enableValidation: true
});

// 执行技能效果
const skillEffect = `
  // 检查MP
  if (caster.currentMp < 50) {
    return { success: false, reason: 'MP不足' };
  }
  
  // 消耗MP
  caster.currentMp -= 50;
  
  // 计算伤害
  const damage = caster.mAtk * 2.5;
  
  // 应用伤害
  target.takeDamage(damage);
  
  // 添加属性加成
  self.mAtk + 10%;
  
  return { success: true, damage };
`;

const context = {
  member: playerInstance,
  target: targetMember, 
  reactiveSystem: playerInstance.getReactiveDataManager(),
  skill: { id: 'fireball', power: 250 }
};

const result = integration.processAndExecute(skillEffect, context);
console.log(result.success); // true
console.log(result.dataOperationsApplied); // 1 (mAtk修饰符)
```

## 支持的数据操作模式

### 1. 百分比修饰符
```javascript
// 输入
self.hp + 10%        // HP增加10%
caster.mAtk - 5%     // 魔攻减少5%

// 转换为
ctx.reactiveSystem.addModifier('hp', 'percentage', 10, source);
ctx.reactiveSystem.addModifier('mAtk', 'percentage', -5, source);
```

### 2. 方法调用
```javascript
// 输入
target.takeDamage(100)  // 造成100点伤害
self.heal(50)           // 恢复50点HP

// 转换为
context.member.takeDamage(100);
context.member.heal(50);
```

### 3. 属性设值（未来支持）
```javascript
// 计划支持
self.currentHp = 100   // 直接设置当前HP

// 转换为
ctx.reactiveSystem.setBaseValue('currentHp', 100);
```

## 安全特性

### 🚫 **被屏蔽的危险操作**
- `eval` / `Function` 构造器
- `setTimeout` / `setInterval`
- `require` / `import`
- `process` / `global` / `window`

### ✅ **允许的安全操作**
- 数学运算 (`Math.*`)
- 控制台输出 (`console.*`)
- 成员属性访问
- ReactiveSystem操作

## 错误处理

```typescript
const result = integration.processAndExecute("invalid code here");

if (!result.success) {
  console.error('执行失败:', result.error);
  // 输出: "执行失败: 验证失败: 语法解析错误: ..."
}

// 检查警告
if (result.warnings.length > 0) {
  console.warn('执行警告:', result.warnings);
}
```

## 性能优化

- **AST缓存**: 避免重复解析相同代码
- **转换缓存**: 缓存转换结果
- **轻量级验证**: 只检查必要的安全项

## 扩展点

### 自定义数据操作模式

```typescript
class CustomProcessor extends JSExpressionProcessor {
  protected identifyDataOperations(ast: Program, operations: DataOperation[]): void {
    super.identifyDataOperations(ast, operations);
    
    // 添加自定义模式识别
    this.identifyCustomPattern(ast, operations);
  }
  
  private identifyCustomPattern(ast: Program, operations: DataOperation[]): void {
    // 实现自定义模式...
  }
}
```

## 最佳实践

1. **验证优先**: 始终先验证代码安全性
2. **错误处理**: 妥善处理验证和执行错误
3. **上下文管理**: 确保执行上下文完整
4. **调试信息**: 启用调试模式便于排查问题

```typescript
const integration = new JSExpressionIntegration({
  enableValidation: true,    // 生产环境必须启用
  enableTransformation: true, // 启用数据操作转换
  strictMode: false          // 根据需要调整
});
```