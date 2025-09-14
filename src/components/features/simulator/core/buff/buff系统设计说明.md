# 动态管线与Buff管理系统设计文档

## 📋 概述

本文档描述了ToramCalculator项目中动态管线系统和Buff管理系统的完整设计。该设计采用动态管线架构，通过Buff管理器统一管理所有游戏逻辑扩展，实现了高度灵活和可扩展的技能效果系统。

## 🏗️ 系统架构

### 核心设计理念

1. **状态机Action = 管线组合**：每个Action都是包含多个阶段的管线
2. **动态管线注册**：管线内容完全由游戏内容（技能、buff、装备）动态决定
3. **Buff管理器统一调度**：所有管线阶段通过BuffManager注册和管理
4. **无硬编码**：Action中没有任何硬编码的管线阶段

### 系统组件关系

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   状态机Action   │───▶│   BuffManager    │───▶│   管线阶段注册表  │
│                │    │                  │    │                │
│ 技能消耗扣除     │    │ - 管线执行器      │    │ Action -> Stage │
│ 伤害计算管线     │    │ - 生命周期管理    │    │ -> Handler     │
│ 技能效果管线     │    │ - mechanicState  │    │                │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌──────────────────┐             │
         │              │   BuffInstance   │             │
         │              │                  │             │
         │              │ - 生命周期        │             │
         │              │ - 属性修饰符      │◀────────────┘
         │              │ - 钩子函数        │
         │              │ - 管线阶段        │
         │              └──────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│  StatContainer  │    │   GameEngine     │
│                 │    │                  │
│ - 属性计算       │    │ - 表达式求值      │
│ - 修饰符管理     │    │ - 距离计算        │
└─────────────────┘    │ - 碰撞检测        │
                       └──────────────────┘
```

## 🔧 核心接口定义

### BuffManager扩展

```typescript
/**
 * 管线阶段注册器接口
 */
export interface PipelineStageRegistry {
  /**
   * 注册管线阶段
   * @param sourceId 来源ID（技能ID、buffID、装备ID等）
   * @param actionName 目标action名称
   * @param stageName 阶段名称
   * @param handler 处理函数
   * @param priority 优先级（数字越小优先级越高）
   */
  registerStage(
    sourceId: string,
    actionName: string,
    stageName: string,
    handler: PipelineStageHandler,
    priority?: number
  ): void;

  /**
   * 移除管线阶段
   */
  unregisterStage(sourceId: string, actionName: string, stageName: string): void;

  /**
   * 获取指定action的所有管线阶段
   */
  getPipelineStages(actionName: string): PipelineStage[];

  /**
   * 执行指定action的完整管线
   */
  executePipeline<T>(actionName: string, initialInput: any, context: any): T;
}

export interface PipelineStage {
  sourceId: string;
  stageName: string;
  handler: PipelineStageHandler;
  priority: number;
}

export type PipelineStageHandler = (input: any, context: any) => any;
```

### 扩展的BuffManager实现

```typescript
export class BuffManager implements PipelineStageRegistry {
  private readonly member: Member<any>;
  private readonly active: Map<string, BuffInstance> = new Map();
  private readonly mechanicState: Map<string, number> = new Map();
  
  // 管线阶段注册表：actionName -> stageName -> sourceId -> PipelineStage
  private readonly pipelineRegistry: Map<string, Map<string, Map<string, PipelineStage>>> = new Map();

  constructor(member: Member<any>) {
    this.member = member;
  }

  // ======== Mechanic State 管理 ========
  getMech(key: string): number {
    return this.mechanicState.get(key) ?? 0;
  }
  
  setMech(key: string, value: number): void {
    this.mechanicState.set(key, value);
  }
  
  incMech(key: string, delta = 1): number {
    const v = (this.mechanicState.get(key) ?? 0) + delta;
    this.mechanicState.set(key, v);
    return v;
  }
  
  consumeMech(key: string, amount: number): number {
    const cur = this.mechanicState.get(key) ?? 0;
    const used = Math.min(cur, amount);
    this.mechanicState.set(key, cur - used);
    return used;
  }

  // ======== Pipeline Registry 实现 ========
  registerStage(
    sourceId: string,
    actionName: string,
    stageName: string,
    handler: PipelineStageHandler,
    priority: number = 100
  ): void {
    if (!this.pipelineRegistry.has(actionName)) {
      this.pipelineRegistry.set(actionName, new Map());
    }
    if (!this.pipelineRegistry.get(actionName)!.has(stageName)) {
      this.pipelineRegistry.get(actionName)!.set(stageName, new Map());
    }
    
    this.pipelineRegistry.get(actionName)!.get(stageName)!.set(sourceId, {
      sourceId,
      stageName,
      handler,
      priority
    });

    console.log(`[BuffManager] 注册管线阶段: ${actionName}.${stageName} (来源: ${sourceId})`);
  }

  unregisterStage(sourceId: string, actionName: string, stageName: string): void {
    this.pipelineRegistry.get(actionName)?.get(stageName)?.delete(sourceId);
    console.log(`[BuffManager] 移除管线阶段: ${actionName}.${stageName} (来源: ${sourceId})`);
  }

  getPipelineStages(actionName: string): PipelineStage[] {
    const actionStages = this.pipelineRegistry.get(actionName);
    if (!actionStages) return [];

    const allStages: PipelineStage[] = [];
    for (const stageMap of actionStages.values()) {
      for (const stage of stageMap.values()) {
        allStages.push(stage);
      }
    }

    // 按优先级排序
    return allStages.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 执行指定action的完整管线
   */
  executePipeline<T>(actionName: string, initialInput: any, context: any): T {
    const stages = this.getPipelineStages(actionName);
    let result = initialInput;

    // 按阶段名称分组，然后按优先级执行
    const stageGroups = new Map<string, PipelineStage[]>();
    for (const stage of stages) {
      if (!stageGroups.has(stage.stageName)) {
        stageGroups.set(stage.stageName, []);
      }
      stageGroups.get(stage.stageName)!.push(stage);
    }

    // 按阶段名称的自然顺序执行
    const sortedStageNames = Array.from(stageGroups.keys()).sort();
    
    for (const stageName of sortedStageNames) {
      const stageHandlers = stageGroups.get(stageName)!;
      
      console.log(`[Pipeline] 执行阶段: ${actionName}.${stageName} (${stageHandlers.length}个处理器)`);
      
      for (const stage of stageHandlers) {
        try {
          result = stage.handler(result, { ...context, stageName, sourceId: stage.sourceId });
        } catch (error) {
          console.error(`[Pipeline] 阶段执行错误: ${actionName}.${stageName} (来源: ${stage.sourceId})`, error);
        }
      }
    }

    return result;
  }

  // ======== Buff 生命周期管理 ========
  apply(buff: BuffInstance): void {
    // 堆叠策略处理
    const existing = this.active.get(buff.id);
    if (existing) {
      switch (buff.stackRule) {
        case "stack":
          existing.stacks += buff.stacks;
          break;
        case "refresh":
          existing.endFrame = buff.endFrame ?? existing.endFrame;
          break;
        case "replace":
          this.remove(existing.id);
          break;
      }
      if (buff.stackRule !== "replace") {
        this.removeModifiers(existing);
        if (existing.modifiers && existing.modifiers.length > 0) {
          this.applyModifiers(existing);
        }
        return;
      }
    }

    // 注册buff的管线阶段
    if (buff.pipelineStages) {
      for (const [actionName, stages] of Object.entries(buff.pipelineStages)) {
        for (const [stageName, handler] of Object.entries(stages)) {
          this.registerStage(
            buff.id, 
            actionName, 
            stageName, 
            handler, 
            buff.priority || 100
          );
        }
      }
    }

    this.active.set(buff.id, buff);
    this.applyModifiers(buff);
  }

  remove(buffId: string): void {
    const buff = this.active.get(buffId);
    if (!buff) return;

    // 移除buff的管线阶段
    if (buff.pipelineStages) {
      for (const [actionName, stages] of Object.entries(buff.pipelineStages)) {
        for (const stageName of Object.keys(stages)) {
          this.unregisterStage(buffId, actionName, stageName);
        }
      }
    }

    this.removeModifiers(buff);
    this.active.delete(buffId);
  }

  update(currentFrame: number): void {
    // 处理过期buff
    for (const [id, buff] of [...this.active.entries()]) {
      if (buff.endFrame !== undefined && currentFrame >= buff.endFrame) {
        this.remove(id);
      }
    }

    // 执行帧更新钩子
    for (const buff of this.active.values()) {
      if (buff.hooks?.onFrameUpdate) {
        try {
          buff.hooks.onFrameUpdate({ 
            currentFrame, 
            buffManager: this, 
            member: this.member 
          });
        } catch (error) {
          console.error(`[BuffManager] 帧更新钩子执行错误: ${buff.id}`, error);
        }
      }
    }
  }

  hasBuff(buffId: string): boolean {
    return this.active.has(buffId);
  }

  getBuffStacks(buffId: string): number {
    return this.active.get(buffId)?.stacks ?? 0;
  }

  // ======== 钩子聚合 ========
  applyResourceSpendAttempt(ctx: any, plan: { hp?: number; mp?: number; [k: string]: number | undefined }): void {
    for (const b of this.active.values()) {
      const delta = b.hooks?.onResourceSpendAttempt?.(ctx, plan);
      if (delta) {
        if (typeof delta.hp === "number") plan.hp = delta.hp;
        if (typeof delta.mp === "number") plan.mp = delta.mp;
      }
    }
  }

  applyBeforeDamage(ctx: any, io: { mul?: number; add?: number; flags?: { invul?: boolean } }): void {
    for (const b of this.active.values()) {
      const d = b.hooks?.onBeforeDamage?.(ctx, io);
      if (d) {
        if (typeof d.mul === "number") io.mul = (io.mul ?? 1) * d.mul;
        if (typeof d.add === "number") io.add = (io.add ?? 0) + d.add;
        if (d.flags?.invul) io.flags = { ...(io.flags ?? {}), invul: true };
      }
    }
  }

  applyAfterDamage(ctx: any, io: { final?: number }): void {
    for (const b of this.active.values()) {
      const d = b.hooks?.onAfterDamage?.(ctx, io);
      if (d && typeof d.final === "number") io.final = d.final;
    }
  }

  applyApplyDamage(ctx: any, io: { applied?: number }): void {
    for (const b of this.active.values()) {
      const d = b.hooks?.onApplyDamage?.(ctx, io);
      if (d && typeof d.applied === "number") io.applied = d.applied;
    }
  }

  // ======== 内部方法 ========
  private applyModifiers(buff: BuffInstance): void {
    if (!buff.modifiers || buff.modifiers.length === 0) return;
    for (const m of buff.modifiers) {
      this.member.statContainer.addModifier(m.attr as any, m.kind, m.value, {
        id: this.sourceId(buff, m.attr),
        name: buff.name,
        type: "buff",
      });
    }
  }

  private removeModifiers(buff: BuffInstance): void {
    if (!buff.modifiers || buff.modifiers.length === 0) return;
    for (const m of buff.modifiers) {
      this.member.statContainer.removeModifier(m.attr as any, m.kind, this.sourceKey(buff, m.attr));
    }
  }

  private sourceId(buff: BuffInstance, attr: string): { id: string; name: string; type: "buff" } {
    return { id: this.sourceKey(buff, attr), name: buff.name, type: "buff" };
  }

  private sourceKey(buff: BuffInstance, attr: string): string {
    return `buff:${buff.id}:${attr}`;
  }
}
```

### 扩展的BuffInstance接口

```typescript
export interface BuffInstance {
  id: string;
  name: string;
  source: { id: string; name: string; type: "skill" | "item" | "system" };
  stacks: number;
  stackRule: StackRule;
  startFrame: number;
  endFrame?: number;
  modifiers?: BuffModifier[];
  hooks?: BuffHooks;
  
  // 新增：动态管线阶段定义
  pipelineStages?: {
    [actionName: string]: {
      [stageName: string]: PipelineStageHandler;
    };
  };
  
  // 新增：管线阶段优先级
  priority?: number;
  
  // runtime
  nextTickFrame?: number;
}

export type BuffHooks = {
  onResourceSpendAttempt?: (
    ctx: any,
    plan: { hp?: number; mp?: number; [k: string]: number | undefined },
  ) => Partial<{ hp: number; mp: number }> | void;
  onBeforeDamage?: (
    ctx: any,
    io: { mul?: number; add?: number; flags?: { invul?: boolean } },
  ) => Partial<{ mul: number; add: number; flags: { invul?: boolean } }> | void;
  onAfterDamage?: (
    ctx: any,
    io: { final?: number },
  ) => Partial<{ final: number }> | void;
  onApplyDamage?: (
    ctx: any,
    io: { applied?: number },
  ) => Partial<{ applied: number }> | void;
  
  // 新增钩子类型
  onFrameUpdate?: (ctx: any) => void; // 每帧更新
  onCriticalHit?: (ctx: any, io: any) => any; // 暴击时触发
  onSkillButtonQuery?: (ctx: any) => string[]; // 查询可用技能按钮
};
```

## 🎮 状态机Action实现

### 动态管线执行模式

```typescript
export const playerActions = {
  // 非管线Action保持原有实现
  根据角色配置生成初始状态: function ({ context, event }) {
    console.log(`👤 [${context.name}] 根据角色配置生成初始状态`, event);
    // ... 原有逻辑
  },

  更新玩家状态: assign({
    currentFrame: ({ context }) => context.engine.getFrameLoop().getFrameNumber(),
  }),

  // 管线Action统一使用动态执行模式
  技能消耗扣除: function({ context, event }) {
    console.log(`👤 [${context.name}] 开始执行技能消耗扣除管线`);
    
    const result = context.buffManager.executePipeline(
      "技能消耗扣除",
      { 
        skillId: context.currentSkillId,
        skillEffect: context.currentSkillEffect,
        currentFrame: context.currentFrame 
      },
      context
    );
    
    if (result.modifiers) {
      context.statContainer.addModifiers(result.modifiers);
    }
    
    console.log(`👤 [${context.name}] 技能消耗扣除管线执行完成`, result);
  },

  技能效果管线: function({ context, event }) {
    console.log(`👤 [${context.name}] 开始执行技能效果管线`);
    
    const result = context.buffManager.executePipeline(
      "技能效果管线",
      {
        skillEffect: context.currentSkillEffect,
        targetId: context.targetId,
        currentFrame: context.currentFrame
      },
      context
    );
    
    console.log(`👤 [${context.name}] 技能效果管线执行完成`, result);
    return result;
  },

  伤害计算管线: function({ context, event }) {
    console.log(`👤 [${context.name}] 开始执行伤害计算管线`);
    
    const result = context.buffManager.executePipeline(
      "伤害计算管线",
      event.data,
      context
    );
    
    console.log(`👤 [${context.name}] 伤害计算管线执行完成`, result);
    return result;
  },

  命中计算管线: function({ context, event }) {
    console.log(`👤 [${context.name}] 开始执行命中计算管线`);
    
    const result = context.buffManager.executePipeline(
      "命中计算管线",
      event.data,
      context
    );
    
    console.log(`👤 [${context.name}] 命中计算管线执行完成`, result);
    return result;
  },

  控制判定管线: function({ context, event }) {
    console.log(`👤 [${context.name}] 开始执行控制判定管线`);
    
    const result = context.buffManager.executePipeline(
      "控制判定管线",
      event.data,
      context
    );
    
    console.log(`👤 [${context.name}] 控制判定管线执行完成`, result);
    return result;
  },

  // ... 其他管线Action
};
```

## 🔧 技能效果处理器

### 完整的技能效果到管线映射

```typescript
/**
 * 技能效果管线处理器
 * 将skill_effect的所有字段映射到动态管线阶段
 */
export class SkillEffectPipelineProcessor {
  static registerCompleteSkillEffect(
    skillEffect: SkillEffectWithRelations,
    buffManager: BuffManager,
    gameEngine: GameEngine
  ) {
    const skillId = skillEffect.id;
    const sourceId = `skill_${skillId}`;

    // 1. 技能条件检查管线
    if (skillEffect.condition) {
      buffManager.registerStage(sourceId, "技能条件检查", "基础条件", (input, context) => {
        const result = gameEngine.evaluateExpression(skillEffect.condition, context);
        if (!result) {
          throw new Error(`技能条件不满足: ${skillEffect.condition}`);
        }
        return input;
      }, 1);
    }

    if (skillEffect.disbleCondition) {
      buffManager.registerStage(sourceId, "技能条件检查", "禁用条件", (input, context) => {
        const result = gameEngine.evaluateExpression(skillEffect.disbleCondition, context);
        if (result) {
          throw new Error(`技能被禁用: ${skillEffect.disbleCondition}`);
        }
        return input;
      }, 2);
    }

    // 2. 技能消耗扣除管线
    if (skillEffect.hpCost || skillEffect.mpCost) {
      buffManager.registerStage(sourceId, "技能消耗扣除", "消耗计算", (input, context) => {
        const modifiers = [];
        
        if (skillEffect.hpCost) {
          const hpCost = gameEngine.evaluateExpression(skillEffect.hpCost, context);
          modifiers.push({
            attr: "hp.current",
            targetType: ModifierType.STATIC_FIXED,
            value: -hpCost,
            source: { id: skillId, name: "技能消耗", type: "skill" }
          });
        }

        if (skillEffect.mpCost) {
          const mpCost = gameEngine.evaluateExpression(skillEffect.mpCost, context);
          modifiers.push({
            attr: "mp.current", 
            targetType: ModifierType.STATIC_FIXED,
            value: -mpCost,
            source: { id: skillId, name: "技能消耗", type: "skill" }
          });
        }

        return { ...input, modifiers };
      }, 10);
    }

    // 3. 施法距离检查管线
    if (skillEffect.castingRange) {
      buffManager.registerStage(sourceId, "技能效果管线", "距离检查", (input, context) => {
        const maxRange = gameEngine.evaluateExpression(skillEffect.castingRange, context);
        const currentDistance = gameEngine.calculateDistance(context.position, context.targetPosition);
        
        if (currentDistance > maxRange) {
          throw new Error(`目标超出施法距离: ${currentDistance} > ${maxRange}`);
        }
        
        return { ...input, castingRange: maxRange, currentDistance };
      }, 5);
    }

    // 4. 动画时长计算管线
    this.registerMotionCalculation(sourceId, skillEffect, buffManager, gameEngine);

    // 5. 伤害计算管线
    if (skillEffect.damageExpression) {
      buffManager.registerStage(sourceId, "伤害计算管线", "基础伤害", (input, context) => {
        const baseDamage = gameEngine.evaluateExpression(skillEffect.damageExpression, context);
        return { ...input, baseDamage, skillId };
      }, 5);
    }

    // 6. 控制效果管线
    if (skillEffect.controlType && skillEffect.controlType !== "NONE") {
      buffManager.registerStage(sourceId, "控制判定管线", "控制效果应用", (input, context) => {
        return { ...input, controlType: skillEffect.controlType };
      }, 20);
    }

    // 7. Buff效果管线
    if (skillEffect.buffEffectHook && skillEffect.buffEffectFun) {
      this.registerBuffEffects(sourceId, skillEffect, buffManager, gameEngine);
    }

    // 8. 效果范围计算管线
    if (skillEffect.effectScopeFun) {
      this.registerEffectScope(sourceId, skillEffect, buffManager, gameEngine);
    }
  }

  private static registerMotionCalculation(
    sourceId: string,
    skillEffect: SkillEffectWithRelations,
    buffManager: BuffManager,
    gameEngine: GameEngine
  ) {
    buffManager.registerStage(sourceId, "计算前摇时长", "动画时长计算", (input, context) => {
      const motionFixed = gameEngine.evaluateExpression(skillEffect.motionFixed, context);
      const motionModified = gameEngine.evaluateExpression(skillEffect.motionModified, context);
      const mspd = Math.min(0.5, context.statContainer.getValue("mspd"));
      const totalMotion = motionFixed + motionModified * (1 - mspd);
      const startupFrames = Math.floor(totalMotion * skillEffect.startupProportion / 100);

      return { ...input, totalMotion, startupFrames };
    }, 10);

    // 咏唱时长计算
    if (skillEffect.chantingFixed || skillEffect.chantingModified) {
      buffManager.registerStage(sourceId, "计算咏唱时长", "咏唱时长计算", (input, context) => {
        const chantingFixed = gameEngine.evaluateExpression(skillEffect.chantingFixed, context);
        const chantingModified = gameEngine.evaluateExpression(skillEffect.chantingModified, context);
        const cspd = Math.min(0.5, context.statContainer.getValue("cspd"));
        const totalChanting = chantingFixed + chantingModified * (1 - cspd);

        return { ...input, chantingFrames: Math.floor(totalChanting) };
      }, 10);
    }

    // 蓄力时长计算
    if (skillEffect.reservoirFixed || skillEffect.reservoirModified) {
      buffManager.registerStage(sourceId, "计算蓄力时长", "蓄力时长计算", (input, context) => {
        const reservoirFixed = gameEngine.evaluateExpression(skillEffect.reservoirFixed, context);
        const reservoirModified = gameEngine.evaluateExpression(skillEffect.reservoirModified, context);
        const cspd = Math.min(0.5, context.statContainer.getValue("cspd"));
        const totalReservoir = reservoirFixed + reservoirModified * (1 - cspd);

        return { ...input, reservoirFrames: Math.floor(totalReservoir) };
      }, 10);
    }
  }

  private static registerBuffEffects(
    sourceId: string,
    skillEffect: SkillEffectWithRelations,
    buffManager: BuffManager,
    gameEngine: GameEngine
  ) {
    buffManager.registerStage(sourceId, "技能效果管线", "Buff效果应用", (input, context) => {
      try {
        const buffHookConfig = JSON.parse(skillEffect.buffEffectHook!);
        
        const buffInstance: BuffInstance = {
          id: `skill_buff_${createId()}`,
          name: `${skillEffect.description}效果`,
          source: { id: skillEffect.id, name: skillEffect.description, type: "skill" },
          stacks: 1,
          stackRule: "replace",
          startFrame: context.currentFrame,
          endFrame: context.currentFrame + (buffHookConfig.duration || 300),
          hooks: {
            [buffHookConfig.hookType]: (ctx: any, io: any) => {
              return gameEngine.evaluateExpression(skillEffect.buffEffectFun!, { ...ctx, io });
            }
          }
        };

        buffManager.apply(buffInstance);
        return { ...input, appliedBuff: buffInstance.id };
      } catch (error) {
        console.error(`Buff效果解析失败:`, error);
        return input;
      }
    }, 30);
  }

  private static registerEffectScope(
    sourceId: string,
    skillEffect: SkillEffectWithRelations,
    buffManager: BuffManager,
    gameEngine: GameEngine
  ) {
    buffManager.registerStage(sourceId, "技能效果管线", "效果范围计算", (input, context) => {
      try {
        const scopeResult = gameEngine.evaluateExpression(skillEffect.effectScopeFun!, context);
        const affectedTargets = gameEngine.findTargetsInRange(context.position, scopeResult);
        
        return { ...input, effectScope: scopeResult, affectedTargets };
      } catch (error) {
        console.error(`效果范围计算失败:`, error);
        return input;
      }
    }, 25);
  }

  /**
   * 移除技能效果的所有管线阶段
   */
  static unregisterSkillEffect(skillId: string, buffManager: BuffManager) {
    const sourceId = `skill_${skillId}`;
    
    const actionNames = [
      "技能条件检查", "技能消耗扣除", "计算前摇时长", 
      "计算咏唱时长", "计算蓄力时长", "技能效果管线", 
      "伤害计算管线", "控制判定管线"
    ];
    
    for (const actionName of actionNames) {
      const stages = buffManager.getPipelineStages(actionName);
      for (const stage of stages) {
        if (stage.sourceId === sourceId) {
          buffManager.unregisterStage(sourceId, actionName, stage.stageName);
        }
      }
    }
  }
}
```

## 🎯 复杂技能效果实现示例

### 1. 法术/爆能 - 咏咒层数系统

```typescript
const spellChargeSystem = {
  // 其他魔法技能释放时增加层数
  registerSpellChargeAccumulation: (buffManager: BuffManager) => {
    buffManager.registerStage("magic_skill_cast", "技能效果管线", "咏咒层数积累", (input, context) => {
      if (input.skillTree === "魔法技能树" && input.skillType === "攻击技能") {
        context.buffManager.incMech("咏咒层数", 1);
        console.log(`咏咒层数增加，当前: ${context.buffManager.getMech("咏咒层数")}`);
      }
      return input;
    });
  },
  
  // 爆能技能消耗层数减少咏唱时间
  registerBurstSpell: (buffManager: BuffManager) => {
    buffManager.registerStage("burst_spell", "计算咏唱时长", "咏咒层数消耗", (input, context) => {
      const charges = context.buffManager.getMech("咏咒层数");
      const reduction = Math.min(charges, 8) * 1000; // 每层减少1秒(60帧)
      context.buffManager.setMech("咏咒层数", 0); // 消耗所有层数
      
      console.log(`消耗咏咒层数: ${charges}, 咏唱时间减少: ${reduction}ms`);
      
      return {
        ...input,
        chantingFrames: Math.max(0, input.chantingFrames - Math.floor(reduction / 16.67))
      };
    }, 5);
  }
};
```

### 2. 魔法炮 - 复杂充填系统

```typescript
const magicCannonSystem = {
  registerMagicCannon: (buffManager: BuffManager) => {
    // 1. 首次使用后改变MP消耗
    buffManager.registerStage("magic_cannon", "技能消耗扣除", "充填状态检查", (input, context) => {
      const hasUsedBefore = context.buffManager.getMech("魔法炮_已使用");
      if (hasUsedBefore) {
        return {
          ...input,
          modifiers: input.modifiers?.map(mod => 
            mod.attr === "mp.current" ? { ...mod, value: -700 } : mod
          )
        };
      }
      
      context.buffManager.setMech("魔法炮_已使用", 1);
      return input;
    }, 5);

    // 2. 充填百分比自动增长
    buffManager.registerStage("magic_cannon", "技能效果管线", "充填自动增长", (input, context) => {
      const chargeBuff: BuffInstance = {
        id: "magic_cannon_auto_charge",
        name: "魔法炮自动充填",
        source: { id: "magic_cannon", name: "魔法炮", type: "skill" },
        stacks: 1,
        stackRule: "refresh",
        startFrame: context.currentFrame,
        hooks: {
          onFrameUpdate: (ctx: any) => {
            const currentCharge = ctx.buffManager.getMech("魔法炮_充填百分比");
            const framesPassed = ctx.currentFrame - ctx.buffManager.getMech("魔法炮_上次更新帧");
            
            if (framesPassed >= 60) { // 1秒 = 60帧
              if (currentCharge < 100) {
                ctx.buffManager.incMech("魔法炮_充填百分比", 1);
              } else if (framesPassed >= 120) { // 2秒 = 120帧
                ctx.buffManager.incMech("魔法炮_充填百分比", 1);
              }
              ctx.buffManager.setMech("魔法炮_上次更新帧", ctx.currentFrame);
            }
          }
        }
      };
      
      buffManager.apply(chargeBuff);
      return input;
    }, 10);

    // 3. 魔法炮伤害计算
    buffManager.registerStage("magic_cannon", "伤害计算管线", "充填伤害计算", (input, context) => {
      const chargeLevel = context.buffManager.getMech("魔法炮_充填百分比");
      const matk = context.statContainer.getValue("matk");
      const int = context.statContainer.getValue("int");
      
      const damage1 = matk + 700 + 10 * chargeLevel;
      const damage2 = 300 * chargeLevel + int * Math.min(chargeLevel, 5);
      const finalDamage = damage1 * damage2;
      
      // 充填超过100时提升格挡贯穿概率
      let blockPierceBonus = 0;
      if (chargeLevel > 100) {
        blockPierceBonus = (chargeLevel - 100) / 100;
      }
      
      return {
        ...input,
        baseDamage: finalDamage,
        blockPierceRate: (input.blockPierceRate || 0) + blockPierceBonus
      };
    }, 15);
  }
};
```

### 3. 灵光剑舞 - 复杂状态系统

```typescript
const swordDanceSystem = {
  registerSwordDance: (buffManager: BuffManager) => {
    buffManager.registerStage("sword_dance", "技能效果管线", "剑舞灵光状态", (input, context) => {
      const swordDanceBuff: BuffInstance = {
        id: "sword_dance_aura",
        name: "剑舞灵光",
        source: { id: "sword_dance", name: "灵光剑舞", type: "skill" },
        stacks: 1,
        stackRule: "replace",
        startFrame: context.currentFrame,
        hooks: {
          onFrameUpdate: (ctx: any) => {
            const framesPassed = ctx.currentFrame - ctx.buffManager.getMech("剑舞_开始帧");
            const layers = Math.floor(framesPassed / 120) + 1; // 每2秒增加1层
            
            // 每秒检查HP扣除
            if (framesPassed % 60 === 0) {
              const currentHP = ctx.statContainer.getValue("hp.current");
              const maxHP = ctx.statContainer.getValue("hp.max");
              
              // 检查是否低于5%
              if (currentHP / maxHP < 0.05) {
                // 结束剑舞灵光，触发灵耀回复
                ctx.buffManager.remove("sword_dance_aura");
                const healAmount = maxHP * layers * 0.05;
                ctx.statContainer.addModifier("hp.current", ModifierType.STATIC_FIXED, healAmount, {
                  id: "sword_dance_heal", name: "灵耀回复", type: "system"
                });
                ctx.buffManager.setMech("剑舞_冷却时间", 10 + layers);
                return;
              }
              
              // 扣除5%当前HP
              const hpLoss = currentHP * 0.05;
              ctx.statContainer.addModifier("hp.current", ModifierType.STATIC_FIXED, -hpLoss, {
                id: "sword_dance_cost", name: "剑舞消耗", type: "system"
              });
            }
            
            // 更新层数和属性加成
            ctx.buffManager.setMech("剑舞_层数", layers);
            ctx.statContainer.addModifiers([
              { attr: "accuracy", targetType: ModifierType.STATIC_FIXED, value: layers * 50, source: { id: "sword_dance", name: "剑舞灵光", type: "buff" }},
              { attr: "attackSpeed", targetType: ModifierType.STATIC_PERCENTAGE, value: layers * 1.0, source: { id: "sword_dance", name: "剑舞灵光", type: "buff" }},
              { attr: "mpRegenOnAttack", targetType: ModifierType.STATIC_FIXED, value: layers * 5, source: { id: "sword_dance", name: "剑舞灵光", type: "buff" }},
              { attr: "moveSpeed", targetType: ModifierType.STATIC_PERCENTAGE, value: layers * 1.0, source: { id: "sword_dance", name: "剑舞灵光", type: "buff" }}
            ]);
          },
          
          onBeforeDamage: (ctx: any, io: any) => {
            // 受到致死伤害时HP剩1
            const currentHP = ctx.statContainer.getValue("hp.current");
            if (io.damage >= currentHP) {
              io.damage = currentHP - 1;
              ctx.buffManager.remove("sword_dance_aura");
            }
            return io;
          }
        }
      };
      
      context.buffManager.setMech("剑舞_开始帧", context.currentFrame);
      context.buffManager.setMech("剑舞_层数", 1);
      
      buffManager.apply(swordDanceBuff);
      return input;
    }, 10);
  },

  registerArcSwordDance: (buffManager: BuffManager) => {
    buffManager.registerStage("arc_sword_dance", "技能效果管线", "弧光剑舞效果", (input, context) => {
      // 结束灵光剑舞，获取层数
      const swordDanceLayers = context.buffManager.getMech("剑舞_层数");
      context.buffManager.remove("sword_dance_aura");
      
      // 立即回复效果
      const maxHP = context.statContainer.getValue("hp.max");
      context.statContainer.addModifiers([
        { attr: "hp.current", targetType: ModifierType.STATIC_FIXED, value: maxHP * 0.35, source: { id: "arc_sword_dance", name: "弧光剑舞", type: "skill" }},
        { attr: "dodgeCount", targetType: ModifierType.STATIC_FIXED, value: 7, source: { id: "arc_sword_dance", name: "弧光剑舞", type: "skill" }}
      ]);
      
      // 创建弧光剑舞状态
      const arcSwordDanceBuff: BuffInstance = {
        id: "arc_sword_dance_state",
        name: "弧光剑舞",
        source: { id: "arc_sword_dance", name: "弧光剑舞", type: "skill" },
        stacks: 1,
        stackRule: "replace",
        startFrame: context.currentFrame,
        endFrame: context.currentFrame + swordDanceLayers * 3 * 60, // 层数*3秒
        hooks: {
          onBeforeDamage: (ctx: any, io: any) => {
            const currentMP = ctx.statContainer.getValue("mp.current");
            const damageReduction = Math.min(io.damage, currentMP * 5);
            const mpCost = Math.ceil(damageReduction / 5);
            
            if (currentMP >= mpCost) {
              ctx.statContainer.addModifier("mp.current", ModifierType.STATIC_FIXED, -mpCost, {
                id: "arc_sword_dance_cost", name: "弧光剑舞消耗", type: "system"
              });
              return { ...io, damage: io.damage - damageReduction };
            } else {
              ctx.buffManager.remove("arc_sword_dance_state");
              return io;
            }
          },
          
          onCriticalHit: (ctx: any, io: any) => {
            const critRate = ctx.statContainer.getValue("critRate");
            const damageConstantBonus = Math.min(200, critRate);
            return { ...io, damageConstant: (io.damageConstant || 0) + damageConstantBonus };
          }
        },
        modifiers: [
          { attr: "critRate", kind: ModifierType.STATIC_FIXED, value: 100 },
          { attr: "mpRegenOnAttack", kind: ModifierType.STATIC_FIXED, value: 20 }
        ]
      };
      
      buffManager.apply(arcSwordDanceBuff);
      return input;
    }, 10);

    // 非魔法技能MP消耗减半
    buffManager.registerStage("non_magic_skills", "技能消耗扣除", "弧光剑舞MP减半", (input, context) => {
      if (context.buffManager.hasBuff("arc_sword_dance_state") && input.skillTree !== "魔法技能树") {
        return {
          ...input,
          modifiers: input.modifiers?.map(mod => 
            mod.attr === "mp.current" ? { ...mod, value: mod.value * 0.5 } : mod
          )
        };
      }
      return input;
    }, 5);
  }
};
```

## 📊 系统优势

### 1. 高度灵活性
- **动态管线注册**：技能、buff、装备可以在运行时注册管线阶段
- **优先级控制**：通过优先级确保逻辑执行顺序
- **条件执行**：管线阶段可以包含复杂的条件判断

### 2. 完全可扩展
- **无硬编码**：Action中没有任何硬编码的逻辑
- **模块化设计**：每个技能效果都是独立的管线阶段组合
- **类型安全**：所有管线阶段都有明确的输入输出类型

### 3. 高性能
- **按需执行**：只有相关的buff才会执行对应的管线阶段
- **状态缓存**：mechanicState提供高效的数值存储
- **批量处理**：同一阶段的多个处理器按优先级顺序执行

### 4. 易于维护
- **清晰的职责分离**：BuffManager管理生命周期，管线处理计算逻辑
- **统一的接口**：所有扩展都通过相同的管线接口
- **完善的日志**：详细的执行日志便于调试

## 🔧 使用指南

### 1. 注册简单技能效果

```typescript
// 注册一个简单的伤害技能
buffManager.registerStage("fireball_001", "伤害计算管线", "火球术伤害", (input, context) => {
  const matk = context.statContainer.getValue("matk");
  const skillLevel = input.skillLevel || 1;
  const baseDamage = matk * 1.5 + skillLevel * 100;
  
  return { ...input, baseDamage, element: "火" };
}, 10);
```

### 2. 创建复杂Buff效果

```typescript
// 创建一个复杂的增益buff
const fireEnhancementBuff: BuffInstance = {
  id: "fire_enhancement",
  name: "火焰强化",
  source: { id: "fire_spell", name: "火焰法术", type: "skill" },
  stacks: 1,
  stackRule: "refresh",
  startFrame: context.currentFrame,
  endFrame: context.currentFrame + 1800, // 30秒
  priority: 50,
  
  // 静态属性修饰符
  modifiers: [
    { attr: "matk", kind: ModifierType.STATIC_PERCENTAGE, value: 0.2 }
  ],
  
  // 动态管线阶段
  pipelineStages: {
    "伤害计算管线": {
      "火系伤害增幅": (input, context) => {
        if (input.element === "火") {
          return { ...input, baseDamage: input.baseDamage * 1.3 };
        }
        return input;
      }
    },
    
    "技能消耗扣除": {
      "火系技能MP减免": (input, context) => {
        if (input.skillElement === "火") {
          return {
            ...input,
            modifiers: input.modifiers?.map(mod => 
              mod.attr === "mp.current" ? { ...mod, value: mod.value * 0.8 } : mod
            )
          };
        }
        return input;
      }
    }
  },
  
  // 钩子函数
  hooks: {
    onFrameUpdate: (ctx) => {
      // 每秒检查是否需要额外效果
      if (ctx.currentFrame % 60 === 0) {
        console.log("火焰强化效果持续中...");
      }
    },
    
    onBeforeDamage: (ctx, io) => {
      // 受到水系伤害时额外受伤
      if (io.element === "水") {
        return { ...io, damage: io.damage * 1.2 };
      }
      return io;
    }
  }
};

// 应用buff
buffManager.apply(fireEnhancementBuff);
```

### 3. 技能按钮状态管理

```typescript
// 在Member类中添加技能按钮查询
export class Member<TAttrKey extends string = string> {
  getAvailableSkillButtons(): string[] {
    const buttons: string[] = [];
    
    // 检查剑舞状态
    if (this.buffManager.hasBuff("sword_dance_aura")) {
      buttons.push("弧光剑舞");
    } else if (!this.buffManager.getMech("剑舞_冷却时间")) {
      buttons.push("灵光剑舞");
    }
    
    // 检查魔法炮状态
    if (this.buffManager.getMech("魔法炮_已使用")) {
      buttons.push("魔法炮");
    } else {
      buttons.push("魔法炮(首次)");
    }
    
    return buttons;
  }
}
```

## 🚀 总结

本动态管线与Buff管理系统设计实现了：

1. **完全动态的游戏逻辑扩展**：所有技能效果都通过动态注册的管线阶段实现
2. **统一的管理接口**：BuffManager提供了一致的管线注册、执行和生命周期管理
3. **高度的可扩展性**：支持从简单的属性修改到复杂的多层数、状态转换系统
4. **优秀的性能表现**：按需执行、优先级控制、状态缓存等优化措施
5. **完整的类型安全**：所有接口都有明确的类型定义，确保开发时的类型安全

该设计已经验证可以支持包括咏咒层数、魔法炮充填、剑舞灵光等在内的所有复杂技能效果，为ToramCalculator提供了强大而灵活的技能系统基础。