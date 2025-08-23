# 🏗️ ToramCalculator 状态同步架构设计

## 📋 问题分析

### 原始架构的问题
1. **职责混乱**：GameEngine作为容器，不应该直接处理通信细节
2. **耦合过紧**：Member直接调用engine.emit，违反了分层原则
3. **通信机制分散**：事件发射和消息路由分散在不同模块

## 🎯 正确的架构设计

### 核心原则
- **单一职责**：每个模块只负责自己的核心功能
- **分层清晰**：通信层、业务层、数据层职责明确
- **统一入口**：所有对外通信都通过MessageRouter

### 架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                    主线程 (Main Thread)                      │
├─────────────────────────────────────────────────────────────┤
│  SimulatorPool ←→ Controller ←→ UI Components              │
└─────────────────────────────────────────────────────────────┘
                              ↕ MessageChannel
┌─────────────────────────────────────────────────────────────┐
│                    Worker线程 (Worker Thread)               │
├─────────────────────────────────────────────────────────────┤
│  GameEngine (容器)                                          │
│  ├── MemberManager (成员管理)                               │
│  ├── MessageRouter (消息路由 + 状态同步) ←──┐              │
│  ├── FrameLoop (帧循环)                     │              │
│  ├── EventQueue (事件队列)                  │              │
│  └── EventHandlerFactory (事件处理器工厂)    │              │
│                                              │              │
│  Member (成员实例)                           │              │
│  ├── Actor (状态机)                          │              │
│  ├── ReactiveSystem (响应式系统)             │              │
│  └── 状态变化监听器 → MessageRouter.syncMemberState() ──────┘
└─────────────────────────────────────────────────────────────┘
```

### 数据流向

#### 1. 状态更新流程
```
Member状态变化 → Actor.subscribe() → MessageRouter.syncMemberState() → 主线程
```

#### 2. 外部指令流程
```
主线程 → MessageRouter.processMessage() → Member.actor.send() → FSM处理
```

#### 3. 状态同步流程
```
MessageRouter.syncState() → 状态同步回调 → postSystemMessage() → 主线程
```

## 🔧 实现细节

### MessageRouter 职责扩展
```typescript
export class MessageRouter {
  // 原有职责：消息路由
  async processMessage(message: IntentMessage): Promise<MessageProcessResult>
  
  // 新增职责：状态同步
  setStateSyncCallback(callback: StateSyncCallback): void
  syncState(eventType: string, data: any): void
  syncMemberState(memberId: string, state: any): void
}
```

### GameEngine 职责简化
```typescript
export class GameEngine {
  // 移除事件发射器功能
  // 通过MessageRouter统一管理状态同步
  
  setStateSyncCallback(callback: (eventType: string, data: any) => void): void
}
```

### Member 职责明确
```typescript
export class Member {
  // 状态变化时，通过MessageRouter同步
  this.actor.subscribe((snapshot) => {
    this.engine.getMessageRouter().syncMemberState(this.id, snapshot);
  });
}
```

## ✅ 架构优势

### 1. 职责清晰
- **GameEngine**：容器，协调各模块
- **MessageRouter**：统一的消息路由和状态同步
- **Member**：业务逻辑，不关心通信细节

### 2. 解耦合
- Member不需要知道如何与主线程通信
- GameEngine专注于容器职责
- 通信逻辑集中在MessageRouter

### 3. 可维护性
- 状态同步逻辑集中管理
- 易于添加新的同步类型
- 统一的错误处理和统计

### 4. 扩展性
- 可以轻松添加新的同步事件类型
- 支持不同的同步策略（实时、批量、节流等）
- 便于添加监控和调试功能

## 🚀 未来扩展

### 1. 同步策略
- 实时同步：重要状态变化立即同步
- 批量同步：非关键状态批量处理
- 节流同步：高频状态变化节流处理

### 2. 监控和调试
- 同步性能监控
- 状态变化历史记录
- 调试工具集成

### 3. 错误处理
- 同步失败重试机制
- 网络异常处理
- 降级策略

## 📝 总结

通过重构，我们实现了：
1. **清晰的职责分离**：每个模块只负责自己的核心功能
2. **统一的通信入口**：MessageRouter成为所有对外通信的统一入口
3. **更好的可维护性**：状态同步逻辑集中，易于维护和扩展
4. **符合架构原则**：遵循单一职责、开闭原则等设计原则

这种设计让系统更加健壮、可维护，并且为未来的功能扩展奠定了良好的基础。
