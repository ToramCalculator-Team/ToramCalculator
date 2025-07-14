/**
 * 模拟器角色状态管理系统
 * 
 * 基于ToramCalculator的数据分层设计，提供完整的角色状态管理功能：
 * - 与XState状态机集成
 * - 使用mathjs进行属性计算
 * - SolidJS响应式状态管理
 * - 支持装备、技能、状态效果的动态计算
 * 
 * 架构分层：
 * 1. 数据源层：基础角色数据、装备数据、技能数据
 * 2. 计算层：mathjs表达式引擎、属性计算器、效果计算器
 * 3. 状态管理层：响应式状态、状态机集成、临时状态管理
 * 4. 接口层：Worker通信接口、UI数据绑定接口
 */

import { CharacterWithRelations, type Character } from "~/repositories/character";
import { type MathNode, all, create, floor, max, min, parse } from "mathjs";
import { MAIN_HAND_TYPE, MAIN_WEAPON_TYPE, SUB_HAND_TYPE, SUB_WEAPON_TYPE, MODIFIER_TYPE, type ModifierType } from "~/../db/enums";
import { createRoot, createSignal, createEffect, createMemo, Accessor, Setter } from "solid-js";
import { createActor, ActorRefFrom, setup } from "xstate";

// ============================== 类型定义 ==============================

/**
 * 基础属性值接口
 * 对应character表中的基础属性
 */
interface BaseAttributes {
  lv: number;   // 等级
  str: number;  // 力量
  int: number;  // 智力  
  vit: number;  // 耐力
  agi: number;  // 敏捷
  dex: number;  // 灵巧
}

/**
 * 计算后的完整属性接口
 * 包含所有MODIFIER_TYPE中定义的属性
 */
interface ComputedAttributes extends BaseAttributes {
  // 衍生基础属性
  luk: number;        // 幸运
  tec: number;        // 技巧
  men: number;        // 异抗
  cri: number;        // 暴击
  maxMp: number;      // 最大MP
  mp: number;         // 当前MP
  maxHp: number;      // 最大HP
  hp: number;         // 当前HP
  
  // 攻击相关
  physicalAtk: number;    // 物理攻击
  magicalAtk: number;     // 魔法攻击
  weaponAtk: number;      // 武器攻击
  unsheatheAtk: number;   // 拔刀攻击
  
  // 防御相关
  physicalDef: number;    // 物理防御
  magicalDef: number;     // 魔法防御
  
  // 暴击相关
  criticalRate: number;   // 暴击率
  criticalDamage: number; // 暴击伤害
  
  // 其他战斗属性
  accuracy: number;       // 命中
  avoidance: number;      // 回避
  stability: number;      // 稳定率
  
  // 可扩展其他MODIFIER_TYPE属性...
}

/**
 * 状态效果接口
 * 表示临时的buff/debuff效果
 */
interface StateEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'neutral';
  duration: number;           // 持续时间（帧数）
  remainingTime: number;      // 剩余时间
  modifiers: Map<ModifierType, number>; // 属性修正值
  isStackable: boolean;       // 是否可叠加
  stackCount: number;         // 叠加层数
  source: string;             // 来源（技能ID、装备ID等）
}

/**
 * 装备效果接口
 * 统一处理各种装备的属性加成
 */
interface EquipmentEffect {
  equipmentId: string;
  equipmentType: 'weapon' | 'subWeapon' | 'armor' | 'optEquip' | 'speEquip';
  modifiers: Map<ModifierType, number>; // 属性加成
  conditions?: string[];      // 生效条件（mathjs表达式）
}

/**
 * 计算上下文接口
 * 提供给mathjs表达式的计算环境
 */
interface CalculationContext {
  base: BaseAttributes;       // 基础属性
  equipment: Map<ModifierType, number>; // 装备加成
  effects: Map<ModifierType, number>;   // 状态效果加成
  level: number;             // 等级
  frameCount: number;        // 当前帧数
  [key: string]: any;        // 其他自定义变量
}

// ============================== 计算层 ==============================

/**
 * mathjs属性计算引擎
 * 负责解析和执行数学表达式，计算角色属性
 */
class AttributeCalculator {
  private math = create(all, {});
  private expressionCache = new Map<string, MathNode>();
  
  constructor() {
    // 注册自定义函数
    this.math.import({
      floor: (x: number) => Math.floor(x),
      max: (a: number, b: number) => Math.max(a, b),
      min: (a: number, b: number) => Math.min(a, b),
      sqrt: (x: number) => Math.sqrt(x),
      // 游戏特有的计算函数
      hpFormula: (vit: number, level: number) => Math.floor(vit * 2 + level * 10),
      mpFormula: (int: number, level: number) => Math.floor(int * 1.5 + level * 5),
      atkFormula: (str: number, weaponAtk: number) => Math.floor(str * 1.2 + weaponAtk),
    });
  }

  /**
   * 解析数学表达式（带缓存）
   * @param expression 数学表达式字符串
   * @returns 解析后的MathNode
   */
  private parseExpression(expression: string): MathNode {
    if (!this.expressionCache.has(expression)) {
      try {
        const node = parse(expression);
        this.expressionCache.set(expression, node);
      } catch (error) {
        console.error(`Failed to parse expression: ${expression}`, error);
        throw error;
      }
    }
    return this.expressionCache.get(expression)!;
  }

  /**
   * 计算单个属性值
   * @param expression 计算表达式
   * @param context 计算上下文
   * @returns 计算结果
   */
  calculate(expression: string, context: CalculationContext): number {
    try {
      const node = this.parseExpression(expression);
      const result = node.evaluate(context);
      return Number(result) || 0;
    } catch (error) {
      console.error(`Calculation error for expression: ${expression}`, error);
      return 0;
    }
  }

  /**
   * 批量计算属性
   * @param expressions 属性表达式映射
   * @param context 计算上下文
   * @returns 计算结果映射
   */
  calculateBatch(
    expressions: Map<keyof ComputedAttributes, string>,
    context: CalculationContext
  ): Partial<ComputedAttributes> {
    const results: Partial<ComputedAttributes> = {};
    
    for (const [attr, expression] of expressions) {
      results[attr] = this.calculate(expression, context);
    }
    
    return results;
  }

  /**
   * 清理表达式缓存
   */
  clearCache(): void {
    this.expressionCache.clear();
  }
}

/**
 * 状态效果管理器
 * 负责管理角色身上的各种临时状态效果
 */
class StateEffectManager {
  private effects = new Map<string, StateEffect>();
  private modifierCache = new Map<ModifierType, number>();
  private isDirty = true;

  /**
   * 添加状态效果
   * @param effect 状态效果
   */
  addEffect(effect: StateEffect): void {
    const existingEffect = this.effects.get(effect.id);
    
    if (existingEffect && effect.isStackable) {
      // 可叠加效果：增加层数
      existingEffect.stackCount = Math.min(existingEffect.stackCount + 1, 10); // 最大10层
      existingEffect.remainingTime = Math.max(existingEffect.remainingTime, effect.duration);
    } else {
      // 不可叠加或新效果：直接设置
      this.effects.set(effect.id, { ...effect });
    }
    
    this.isDirty = true;
  }

  /**
   * 移除状态效果
   * @param effectId 效果ID
   */
  removeEffect(effectId: string): void {
    if (this.effects.delete(effectId)) {
      this.isDirty = true;
    }
  }

  /**
   * 更新状态效果（每帧调用）
   * @param deltaFrames 经过的帧数
   */
  update(deltaFrames: number = 1): void {
    let hasExpired = false;
    
    for (const [id, effect] of this.effects) {
      effect.remainingTime -= deltaFrames;
      
      if (effect.remainingTime <= 0) {
        this.effects.delete(id);
        hasExpired = true;
      }
    }
    
    if (hasExpired) {
      this.isDirty = true;
    }
  }

  /**
   * 获取所有状态效果的属性修正值
   * @returns 属性修正值映射
   */
  getModifiers(): Map<ModifierType, number> {
    if (!this.isDirty) {
      return this.modifierCache;
    }

    this.modifierCache.clear();
    
    for (const effect of this.effects.values()) {
      for (const [modifier, value] of effect.modifiers) {
        const currentValue = this.modifierCache.get(modifier) || 0;
        this.modifierCache.set(modifier, currentValue + value * effect.stackCount);
      }
    }
    
    this.isDirty = false;
    return this.modifierCache;
  }

  /**
   * 获取所有激活的状态效果
   * @returns 状态效果数组
   */
  getActiveEffects(): StateEffect[] {
    return Array.from(this.effects.values());
  }

  /**
   * 清理所有状态效果
   */
  clear(): void {
    this.effects.clear();
    this.modifierCache.clear();
    this.isDirty = true;
  }
}

/**
 * 装备效果计算器
 * 负责计算装备提供的属性加成
 */
class EquipmentEffectCalculator {
  private calculator = new AttributeCalculator();

  /**
   * 计算装备效果
   * @param character 角色数据
   * @param context 计算上下文
   * @returns 装备属性加成
   */
  calculateEquipmentEffects(
    character: CharacterWithRelations,
    context: CalculationContext
  ): Map<ModifierType, number> {
    const totalModifiers = new Map<ModifierType, number>();

    // 处理主武器效果
    if (character.weapon) {
      this.addEquipmentModifiers(totalModifiers, character.weapon, context);
    }

    // 处理副武器效果
    if (character.subWeapon) {
      this.addEquipmentModifiers(totalModifiers, character.subWeapon, context);
    }

    // 处理防具效果
    if (character.armor) {
      this.addEquipmentModifiers(totalModifiers, character.armor, context);
    }

    // 处理附加装备效果
    if (character.optEquip) {
      this.addEquipmentModifiers(totalModifiers, character.optEquip, context);
    }

    // 处理特殊装备效果
    if (character.speEquip) {
      this.addEquipmentModifiers(totalModifiers, character.speEquip, context);
    }

    return totalModifiers;
  }

  /**
   * 添加单个装备的属性修正
   * @param totalModifiers 总修正值映射
   * @param equipment 装备数据
   * @param context 计算上下文
   */
  private addEquipmentModifiers(
    totalModifiers: Map<ModifierType, number>,
    equipment: any, // 具体类型根据实际装备接口定义
    context: CalculationContext
  ): void {
    if (!equipment?.modifiers) return;

    // 处理装备的修正值（这里需要根据实际装备数据结构调整）
    for (const modifier of equipment.modifiers) {
      if (typeof modifier === 'string') {
        // 如果modifier是表达式字符串
        try {
          const value = this.calculator.calculate(modifier, context);
          // 需要解析modifier获取属性类型和数值
          // 这里简化处理，实际需要根据数据结构调整
        } catch (error) {
          console.error('Equipment modifier calculation error:', error);
        }
      }
      // 其他modifier格式的处理...
    }
  }
}

// ============================== 状态管理层 ==============================

/**
 * 主要角色状态类
 * 整合所有状态管理功能，提供响应式接口
 */
export class PlayerState {
  // 响应式状态
  private [baseAttributes, setBaseAttributes]: [Accessor<BaseAttributes>, Setter<BaseAttributes>];
  private [computedAttributes, setComputedAttributes]: [Accessor<ComputedAttributes>, Setter<ComputedAttributes>];
  private [frameCount, setFrameCount]: [Accessor<number>, Setter<number>];
  private [isCalculating, setIsCalculating]: [Accessor<boolean>, Setter<boolean>];

  // 计算引擎
  private attributeCalculator = new AttributeCalculator();
  private stateEffectManager = new StateEffectManager();
  private equipmentCalculator = new EquipmentEffectCalculator();

  // 角色数据
  private character: CharacterWithRelations;
  
  // 状态机相关
  private stateMachine?: ActorRefFrom<any>;
  
  constructor(character: CharacterWithRelations) {
    this.character = character;
    
    // 初始化响应式状态
    createRoot(() => {
      [this.baseAttributes, this.setBaseAttributes] = createSignal<BaseAttributes>({
        lv: character.lv,
        str: character.str,
        int: character.int,
        vit: character.vit,
        agi: character.agi,
        dex: character.dex,
      });

      [this.computedAttributes, this.setComputedAttributes] = createSignal<ComputedAttributes>(
        this.createInitialComputedAttributes()
      );

      [this.frameCount, this.setFrameCount] = createSignal(0);
      [this.isCalculating, this.setIsCalculating] = createSignal(false);

      // 创建计算效果：当基础属性或帧数变化时重新计算
      createEffect(() => {
        const base = this.baseAttributes();
        const frame = this.frameCount();
        this.recalculateAttributes();
      });
    });
  }

  /**
   * 创建初始的计算属性
   */
  private createInitialComputedAttributes(): ComputedAttributes {
    const base = this.baseAttributes();
    
    return {
      ...base,
      luk: 0,
      tec: 0,
      men: 0,
      cri: 0,
      maxMp: Math.floor(base.int * 1.5 + base.lv * 5),
      mp: Math.floor(base.int * 1.5 + base.lv * 5),
      maxHp: Math.floor(base.vit * 2 + base.lv * 10),
      hp: Math.floor(base.vit * 2 + base.lv * 10),
      physicalAtk: Math.floor(base.str * 1.2),
      magicalAtk: Math.floor(base.int * 1.1),
      weaponAtk: 0,
      unsheatheAtk: 0,
      physicalDef: Math.floor(base.vit * 0.8),
      magicalDef: Math.floor(base.int * 0.6),
      criticalRate: Math.floor(base.dex * 0.1),
      criticalDamage: 150, // 默认150%
      accuracy: Math.floor(base.dex * 0.5),
      avoidance: Math.floor(base.agi * 0.3),
      stability: 50, // 默认50%
    };
  }

  /**
   * 重新计算所有属性
   */
  private recalculateAttributes(): void {
    if (this.isCalculating()) return;
    
    this.setIsCalculating(true);
    
    try {
      // 更新状态效果
      this.stateEffectManager.update();
      
      // 构建计算上下文
      const context: CalculationContext = {
        base: this.baseAttributes(),
        equipment: this.equipmentCalculator.calculateEquipmentEffects(this.character, {} as any),
        effects: this.stateEffectManager.getModifiers(),
        level: this.baseAttributes().lv,
        frameCount: this.frameCount(),
      };
      
      // 定义属性计算表达式
      const expressions = new Map<keyof ComputedAttributes, string>([
        // 基础属性表达式
        ['maxHp', 'hpFormula(base.vit + (equipment.get("vit") || 0) + (effects.get("vit") || 0), level)'],
        ['maxMp', 'mpFormula(base.int + (equipment.get("int") || 0) + (effects.get("int") || 0), level)'],
        ['physicalAtk', 'atkFormula(base.str + (equipment.get("str") || 0) + (effects.get("str") || 0), equipment.get("weaponAtk") || 0)'],
        ['magicalAtk', '(base.int + (equipment.get("int") || 0) + (effects.get("int") || 0)) * 1.1 + (equipment.get("magicalAtk") || 0)'],
        ['criticalRate', '(base.dex + (equipment.get("dex") || 0) + (effects.get("dex") || 0)) * 0.1 + (equipment.get("criticalRate") || 0)'],
        // 可以添加更多复杂的计算表达式...
      ]);
      
      // 批量计算属性
      const newAttributes = this.attributeCalculator.calculateBatch(expressions, context);
      
      // 更新计算后的属性
      this.setComputedAttributes(prev => ({
        ...prev,
        ...newAttributes,
      }));
      
    } catch (error) {
      console.error('Attribute calculation error:', error);
    } finally {
      this.setIsCalculating(false);
    }
  }

  // ============================== 公共接口 ==============================

  /**
   * 获取基础属性（响应式）
   */
  getBaseAttributes(): Accessor<BaseAttributes> {
    return this.baseAttributes;
  }

  /**
   * 获取计算后属性（响应式）
   */
  getComputedAttributes(): Accessor<ComputedAttributes> {
    return this.computedAttributes;
  }

  /**
   * 获取当前帧数（响应式）
   */
  getFrameCount(): Accessor<number> {
    return this.frameCount;
  }

  /**
   * 更新基础属性
   * @param updates 属性更新对象
   */
  updateBaseAttributes(updates: Partial<BaseAttributes>): void {
    this.setBaseAttributes(prev => ({ ...prev, ...updates }));
  }

  /**
   * 前进一帧
   */
  advanceFrame(): void {
    this.setFrameCount(prev => prev + 1);
  }

  /**
   * 重置帧计数
   */
  resetFrame(): void {
    this.setFrameCount(0);
  }

  /**
   * 添加状态效果
   * @param effect 状态效果
   */
  addStateEffect(effect: StateEffect): void {
    this.stateEffectManager.addEffect(effect);
    this.recalculateAttributes();
  }

  /**
   * 移除状态效果
   * @param effectId 效果ID
   */
  removeStateEffect(effectId: string): void {
    this.stateEffectManager.removeEffect(effectId);
    this.recalculateAttributes();
  }

  /**
   * 获取所有激活的状态效果
   */
  getActiveEffects(): StateEffect[] {
    return this.stateEffectManager.getActiveEffects();
  }

  /**
   * 设置XState状态机
   * @param machine 状态机实例
   */
  setStateMachine(machine: ActorRefFrom<any>): void {
    this.stateMachine = machine;
  }

  /**
   * 发送状态机事件
   * @param event 事件对象
   */
  sendEvent(event: any): void {
    this.stateMachine?.send(event);
  }

  /**
   * 获取适合Worker的数据快照
   * @returns 序列化友好的状态快照
   */
  getSnapshot(): {
    base: BaseAttributes;
    computed: ComputedAttributes;
    effects: StateEffect[];
    frameCount: number;
    characterId: string;
  } {
    return {
      base: this.baseAttributes(),
      computed: this.computedAttributes(),
      effects: this.getActiveEffects(),
      frameCount: this.frameCount(),
      characterId: this.character.id,
    };
  }

  /**
   * 从快照恢复状态
   * @param snapshot 状态快照
   */
  restoreFromSnapshot(snapshot: ReturnType<PlayerState['getSnapshot']>): void {
    this.setBaseAttributes(snapshot.base);
    this.setComputedAttributes(snapshot.computed);
    this.setFrameCount(snapshot.frameCount);
    
    // 恢复状态效果
    this.stateEffectManager.clear();
    for (const effect of snapshot.effects) {
      this.stateEffectManager.addEffect(effect);
    }
  }

  /**
   * 销毁状态管理器
   */
  dispose(): void {
    this.stateEffectManager.clear();
    this.attributeCalculator.clearCache();
    this.stateMachine?.stop?.();
  }
}

// ============================== 工厂函数 ==============================

/**
 * 创建角色状态实例
 * @param character 角色数据
 * @returns 角色状态实例
 */
export function createPlayerState(character: CharacterWithRelations): PlayerState {
  return new PlayerState(character);
}

/**
 * 创建状态效果
 * @param config 效果配置
 * @returns 状态效果实例
 */
export function createStateEffect(config: {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'neutral';
  duration: number;
  modifiers: Record<ModifierType, number>;
  isStackable?: boolean;
  source?: string;
}): StateEffect {
  return {
    id: config.id,
    name: config.name,
    type: config.type,
    duration: config.duration,
    remainingTime: config.duration,
    modifiers: new Map(Object.entries(config.modifiers) as [ModifierType, number][]),
    isStackable: config.isStackable ?? false,
    stackCount: 1,
    source: config.source ?? 'unknown',
  };
}

// ============================== 导出类型 ==============================

export type {
  BaseAttributes,
  ComputedAttributes,
  StateEffect,
  EquipmentEffect,
  CalculationContext,
};

