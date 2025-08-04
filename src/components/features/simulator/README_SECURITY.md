# 🛡️ GameEngine 安全使用指南

## 概述

为了确保JS片段执行的安全性，`GameEngine` 现在只能在Worker线程中运行。在浏览器主线程中尝试创建 `GameEngine` 实例将抛出安全错误。

## 正确使用方式

### ✅ 推荐：通过SimulatorPool使用

```typescript
import { EnhancedSimulatorPool } from '~/components/features/simulator/SimulatorPool';

// 创建线程池
const pool = new EnhancedSimulatorPool();

// 启动模拟器（在Worker中安全运行）
await pool.startSimulation(simulatorData);

// 发送指令（包含JS片段）
await pool.sendIntent({
  id: 'test_001',
  type: 'custom',
  targetMemberId: 'member_001',
  timestamp: Date.now(),
  data: {
    scriptCode: `
      // 安全的JS片段执行
      caster.setAttributeValue('str', 'baseValue', 100, 'test');
      return { success: true };
    `
  }
});
```

### ❌ 禁止：在主线程直接创建

```typescript
// 这将抛出安全错误！
const engine = new GameEngine(); // ❌ 禁止
```

## 测试环境使用

### 在测试中启用（谨慎使用）

如果确实需要在测试中直接使用GameEngine：

```typescript
import GameEngine from '~/components/features/simulator/core/GameEngine';

// 在测试开始前启用
GameEngine.enableForTesting();

try {
  // 现在可以在测试中创建GameEngine
  const engine = new GameEngine();
  // ... 测试代码
} finally {
  // 测试结束后恢复安全检查
  GameEngine.disableForTesting();
}
```

### 测试框架集成

可以在测试setup中自动处理：

```typescript
// test-setup.ts
import GameEngine from '~/components/features/simulator/core/GameEngine';

beforeEach(() => {
  GameEngine.enableForTesting();
});

afterEach(() => {
  GameEngine.disableForTesting();
});
```

## 安全特性

### 多层安全保护

1. **运行环境检查**: 阻止在浏览器主线程创建GameEngine
2. **Worker沙盒**: 所有JS片段在Worker中隔离执行
3. **全局对象屏蔽**: 危险对象（process, require, eval等）被设为undefined
4. **代码清理**: 自动替换危险关键字（this, global等）

### 环境检测逻辑

GameEngine会检测以下环境：

- 🛡️ **沙盒Worker**: 最安全，推荐环境
- 🔧 **普通Worker**: 安全，允许运行
- 🧪 **Node.js**: 测试环境，允许运行
- ⚠️ **测试标记**: 手动启用的测试环境
- ❌ **浏览器主线程**: 禁止运行

## 常见错误和解决方案

### 错误：安全限制

```
🛡️ 安全限制：GameEngine禁止在浏览器主线程中运行！
请使用SimulatorPool启动Worker中的GameEngine实例。
```

**解决方案**：
1. 使用 `SimulatorPool` 替代直接创建GameEngine
2. 如果是测试，使用 `GameEngine.enableForTesting()`

### 错误：Worker通信失败

确保正确初始化SimulatorPool：

```typescript
const pool = new EnhancedSimulatorPool();
// 等待Worker准备
await pool.startSimulation(data);
```

## 最佳实践

1. **永远使用SimulatorPool**: 不要尝试绕过安全检查
2. **测试后清理**: 使用`disableForTesting()`恢复安全检查
3. **JS片段验证**: 确保传入的JS代码是安全的
4. **错误处理**: 妥善处理Worker通信错误

## 技术原理

### 为什么需要Worker隔离？

- **安全性**: JS片段可能包含恶意代码
- **稳定性**: 错误的JS不会影响主线程UI
- **性能**: 密集计算不会阻塞用户交互

### 沙盒机制

```typescript
// Worker中的安全环境
{
  // 提供的安全API
  console, setTimeout, Math, JSON, Date,
  
  // 屏蔽的危险对象
  this: undefined,
  global: undefined,
  process: undefined,
  require: undefined,
  Function: undefined,
  eval: undefined
}
```

这确保了JS片段只能访问预定义的安全API，无法执行危险操作。