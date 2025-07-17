/**
 * 基于XState的成员基类
 *
 * 设计理念：
 * 1. 使用XState管理成员状态机
 * 2. 支持事件队列处理
 * 3. 根据成员类型生成对应属性
 * 4. 为扩展Player、Mob等子类提供基础架构
 * 5. 与GameEngine集成的事件系统
 */

import { setup, createActor, assign, fromPromise, fromCallback } from "xstate";
import type { MemberWithRelations } from "~/repositories/member";
import type { PlayerWithRelations } from "~/repositories/player";
import type { MercenaryWithRelations } from "~/repositories/mercenary";
import type { MobWithRelations } from "~/repositories/mob";
import { MEMBER_TYPE, type MemberType } from "~/../db/enums";
import Player from "./Player";

// ============================== 类型定义 ==============================

/**
 * 属性值类型枚举
 */
export enum ValueType {
  user = "user",
  system = "system",
}

/**
 * 目标类型枚举
 */
export enum TargetType {
  baseValue = "baseValue",
  staticConstant = "staticConstant",
  staticPercentage = "staticPercentage",
  dynamicConstant = "dynamicConstant",
  dynamicPercentage = "dynamicPercentage",
}

/**
 * 属性影响关系接口
 */
export interface AttributeInfluence {
  name: string; // 将影响的目标属性
  targetType: TargetType; // 作用的位置
  computation: () => number; // 作用的值
}

/**
 * 属性修改器
 */
export interface ModifiersData {
  static: {
    fixed: {
      value: number;
      origin: string;
    }[];
    percentage: {
      value: number;
      origin: string;
    }[];
  };
  dynamic: {
    fixed: {
      value: number;
      origin: string;
    }[];
    percentage: {
      value: number;
      origin: string;
    }[];
  };
}

/**
 * 玩家属性数据接口
 */
export interface AttrData {
  type: ValueType;
  name: string;
  baseValue:
    | number
    | Array<{
        value: number;
        sourceName: string;
        source: string;
      }>;
  modifiers: ModifiersData;
  influences: AttributeInfluence[];
}

/**
 * 成员基础属性接口
 * 定义所有成员类型共有的基础属性
 */
export interface MemberBaseStats {
  /** 最大生命值 */
  maxHp: number;
  /** 当前生命值 */
  currentHp: number;
  /** 最大魔法值 */
  maxMp: number;
  /** 当前魔法值 */
  currentMp: number;
  /** 物理攻击力 */
  physicalAtk: number;
  /** 魔法攻击力 */
  magicalAtk: number;
  /** 物理防御力 */
  physicalDef: number;
  /** 魔法防御力 */
  magicalDef: number;
  /** 攻击速度 */
  aspd: number;
  /** 移动速度 */
  mspd: number;
  /** 位置坐标 */
  position: { x: number; y: number };
}

/**
 * 成员状态机上下文接口
 * 定义状态机运行时的上下文数据
 */
export interface MemberContext {
  /** 成员基础数据（来自数据库） */
  memberData: MemberWithRelations;
  /** 成员基础属性 */
  stats:  Map<Number, AttrData>;
  /** 是否存活 */
  isAlive: boolean;
  /** 是否可行动 */
  isActive: boolean;
  /** 当前状态效果 */
  statusEffects: string[];
  /** 事件队列 */
  eventQueue: MemberEvent[];
  /** 最后更新时间戳 */
  lastUpdateTimestamp: number;
  /** 额外数据 */
  extraData: Record<string, any>;
}

/**
 * 成员事件接口
 * 定义成员状态机可以处理的事件类型
 */
export interface MemberEvent {
  /** 事件ID */
  id: string;
  /** 事件类型 */
  type: string;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件数据 */
  data: Record<string, any>;
}

/**
 * 成员事件类型枚举
 */
export type MemberEventType =
  | "spawn" // 生成事件
  | "death" // 死亡事件
  | "damage" // 受到伤害
  | "heal" // 治疗事件
  | "skill_start" // 技能开始
  | "skill_end" // 技能结束
  | "move" // 移动事件
  | "status_effect" // 状态效果
  | "update" // 更新事件
  | "custom"; // 自定义事件

// ============================== 类型守卫函数 ==============================

/**
 * 类型守卫：检查成员是否为玩家类型
 */
export function isPlayerMember(
  member: MemberWithRelations,
): member is MemberWithRelations & { player: NonNullable<MemberWithRelations["player"]> } {
  return member.player !== null && member.player !== undefined;
}

/**
 * 类型守卫：检查成员是否为佣兵类型
 */
export function isMercenaryMember(
  member: MemberWithRelations,
): member is MemberWithRelations & { mercenary: NonNullable<MemberWithRelations["mercenary"]> } {
  return member.mercenary !== null && member.mercenary !== undefined;
}

/**
 * 类型守卫：检查成员是否为怪物类型
 */
export function isMobMember(
  member: MemberWithRelations,
): member is MemberWithRelations & { mob: NonNullable<MemberWithRelations["mob"]> } {
  return member.mob !== null && member.mob !== undefined;
}

/**
 * 类型守卫：检查成员是否为伙伴类型
 */
export function isPartnerMember(
  member: MemberWithRelations,
): member is MemberWithRelations & { partner: NonNullable<MemberWithRelations["partner"]> } {
  return member.partner !== null && member.partner !== undefined;
}

// ============================== 成员基类 ==============================

/**
 * 成员基类
 * 提供基于XState的状态机管理和事件队列处理
 */
export abstract class Member {
  // ==================== 核心属性 ====================

  /** 成员唯一标识符 */
  protected readonly id: string;

  /** 成员类型 */
  protected readonly type: MemberType;

  /** 成员目标 */
  protected target: Member | null = null;

  /** XState状态机实例 */
  protected actor: any;

  /** 事件队列 */
  protected eventQueue: MemberEvent[] = [];

  /** 最后更新时间戳 */
  protected lastUpdateTimestamp: number = 0;

  // ==================== 静态参数统计方法 ====================

  /** 计算属性基础值 */
  static baseValue = (m: AttrData | undefined): number => {
    if (!m) throw new Error("传入的属性无法计算");
    if (typeof m.baseValue === "number") return m.baseValue;
    let sum = 0;
    for (let i = 0; i < m.baseValue.length; i++) {
      sum += m.baseValue[i].value;
    }
    return sum;
  };

  /** 计算静态固定值 */
  static staticFixedValue = (m: AttrData): number => {
    const fixedArray = m.modifiers.static.fixed.map((mod) => mod.value);
    return fixedArray.reduce((a, b) => a + b, 0);
  };

  /** 计算动态固定值 */
  static dynamicFixedValue = (m: AttrData): number => {
    let value = 0;
    if (m.modifiers.dynamic?.fixed) {
      const fixedArray = m.modifiers.dynamic.fixed.map((mod) => mod.value);
      value = fixedArray.reduce((a, b) => a + b, 0) + this.staticFixedValue(m);
    }
    return value;
  };

  /** 计算静态百分比值 */
  static staticPercentageValue = (m: AttrData): number => {
    const percentageArray = m.modifiers.static.percentage.map((mod) => mod.value);
    return percentageArray.reduce((a, b) => a + b, 0);
  };

  /** 计算动态百分比值 */
  static dynamicPercentageValue = (m: AttrData): number => {
    let value = 0;
    if (m.modifiers.dynamic?.percentage) {
      const percentageArray = m.modifiers.dynamic.percentage.map((mod) => mod.value);
      value = percentageArray.reduce((a, b) => a + b, 0) + this.staticPercentageValue(m);
    }
    return value;
  };

  /** 计算静态总值 */
  static staticTotalValue = (m: AttrData): number => {
    const base = this.baseValue(m);
    const fixed = this.staticFixedValue(m);
    const percentage = this.staticPercentageValue(m);
    return base * (1 + percentage / 100) + fixed;
  };

  /** 计算动态总值 */
  static dynamicTotalValue = (m: AttrData | undefined): number => {
    if (!m) throw new Error("传入的属性无法计算");
    const base = this.baseValue(m);
    const fixed = this.dynamicFixedValue(m);
    const percentage = this.dynamicPercentageValue(m);
    return Math.floor(base * (1 + percentage / 100) + fixed);
  };

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   *
   * @param memberData 成员基础数据
   * @param initialState 初始状态配置
   */
  constructor(
    protected readonly memberData: MemberWithRelations,
    initialState: {
      position?: { x: number; y: number };
      currentHp?: number;
      currentMp?: number;
    } = {},
  ) {
    this.id = memberData.id;
    this.type = memberData.type;

    // 创建状态机实例
    this.actor = createActor(this.createStateMachine(initialState));

    // 启动状态机
    this.actor.start();

    console.log(`🎭 创建成员: ${memberData.name} (${this.type})`);
  }

  // ==================== 抽象方法 ====================

  /**
   * 处理成员特定事件
   * 子类可以重写此方法来处理特定类型的事件
   *
   * @param event 事件对象
   */
  protected abstract handleSpecificEvent(event: MemberEvent): void;

  /**
   * 创建状态机
   * 子类必须实现此方法来创建特定类型的状态机
   *
   * @param initialState 初始状态
   * @returns 状态机配置
   */
  protected abstract createStateMachine(initialState: {
    position?: { x: number; y: number };
    currentHp?: number;
    currentMp?: number;
  }): any;

  // ==================== 公共接口 ====================

  /**
   * 获取成员ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取成员类型
   */
  getType(): MemberType {
    return this.type;
  }

  /**
   * 获取成员名称
   */
  getName(): string {
    return this.memberData.name;
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): any {
    return this.actor.getSnapshot();
  }

  /**
   * 获取成员属性
   */
  getStats(): MemberBaseStats {
    return this.actor.getSnapshot().context.stats;
  }

  /**
   * 检查是否存活
   */
  isAlive(): boolean {
    return this.actor.getSnapshot().context.isAlive;
  }

  /**
   * 检查是否可行动
   */
  isActive(): boolean {
    return this.actor.getSnapshot().context.isActive;
  }

  /**
   * 添加事件到队列
   *
   * @param event 要添加的事件
   */
  addEvent(event: MemberEvent): void {
    this.eventQueue.push(event);
    console.log(`📝 添加事件到队列: ${this.getName()} -> ${event.type}`);
  }

  /**
   * 处理事件队列
   * 处理所有待处理的事件
   *
   * @param currentTimestamp 当前时间戳
   */
  processEventQueue(currentTimestamp: number): void {
    const eventsToProcess = this.eventQueue.filter((event) => event.timestamp <= currentTimestamp);

    for (const event of eventsToProcess) {
      this.processEvent(event);
    }

    // 移除已处理的事件
    this.eventQueue = this.eventQueue.filter((event) => event.timestamp > currentTimestamp);

    this.lastUpdateTimestamp = currentTimestamp;
  }

  /**
   * 更新成员状态
   *
   * @param currentTimestamp 当前时间戳
   */
  update(currentTimestamp: number): void {
    // 处理事件队列
    this.processEventQueue(currentTimestamp);

    // 发送更新事件到状态机
    this.actor.send({ type: "update", timestamp: currentTimestamp });

    // 调用子类特定的更新逻辑
    this.onUpdate(currentTimestamp);
  }

  /**
   * 受到伤害
   *
   * @param damage 伤害值
   * @param damageType 伤害类型
   * @param sourceId 伤害来源ID
   */
  takeDamage(damage: number, damageType: "physical" | "magical" = "physical", sourceId?: string): void {
    const event: MemberEvent = {
      id: `damage_${Date.now()}_${Math.random()}`,
      type: "damage",
      timestamp: this.lastUpdateTimestamp,
      data: { damage, damageType, sourceId },
    };

    this.addEvent(event);
  }

  /**
   * 受到治疗
   *
   * @param heal 治疗值
   * @param sourceId 治疗来源ID
   */
  takeHeal(heal: number, sourceId?: string): void {
    const event: MemberEvent = {
      id: `heal_${Date.now()}_${Math.random()}`,
      type: "heal",
      timestamp: this.lastUpdateTimestamp,
      data: { heal, sourceId },
    };

    this.addEvent(event);
  }

  /**
   * 移动到指定位置
   *
   * @param position 目标位置
   */
  moveTo(position: { x: number; y: number }): void {
    const event: MemberEvent = {
      id: `move_${Date.now()}_${Math.random()}`,
      type: "move",
      timestamp: this.lastUpdateTimestamp,
      data: { position },
    };

    this.addEvent(event);
  }

  /**
   * 使用技能
   *
   * @param skillId 技能ID
   * @param targetId 目标ID
   */
  useSkill(skillId: string): void {
    const event: MemberEvent = {
      id: `skill_${Date.now()}_${Math.random()}`,
      type: "skill_start",
      timestamp: this.lastUpdateTimestamp,
      data: { skillId, target: this.target },
    };

    this.addEvent(event);
  }

  // ==================== 受保护的方法 ====================

  /**
   * 处理单个事件
   *
   * @param event 要处理的事件
   */
  protected processEvent(event: MemberEvent): void {
    // 发送事件到状态机
    this.actor.send(event);

    // 调用子类特定的处理逻辑
    this.handleSpecificEvent(event);
  }

  /**
   * 更新回调
   * 子类可以重写此方法来实现特定的更新逻辑
   *
   * @param currentTimestamp 当前时间戳
   */
  protected onUpdate(currentTimestamp: number): void {
    // 默认实现为空，子类可以重写
  }

  // ==================== 工具方法 ====================

  /**
   * 获取成员信息摘要
   */
  getSummary(): string {
    const stats = this.getStats();
    const state = this.getCurrentState();

    return `${this.getName()} (${this.type}) - HP: ${stats.currentHp}/${stats.maxHp} - 状态: ${state.value}`;
  }

  /**
   * 销毁成员
   * 清理资源并停止状态机
   */
  destroy(): void {
    this.actor.stop();
    this.eventQueue = [];
    console.log(`🗑️ 销毁成员: ${this.getName()}`);
  }

  // ==================== 引擎标准接口 ====================

  /**
   * 获取状态机引用
   * 供引擎和MessageRouter使用
   * 
   * @returns 状态机实例
   */
  getFSM(): any {
    return this.actor;
  }

  /**
   * 检查是否可以接受输入
   * 供MessageRouter验证消息是否可以被处理
   * 
   * @returns 是否可以接受输入
   */
  canAcceptInput(): boolean {
    const state = this.getCurrentState();
    return this.isAlive() && this.isActive() && state.value !== "stunned" && state.value !== "casting";
  }

  /**
   * 处理技能开始事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onSkillStart(data: any): void {
    const event: MemberEvent = {
      id: `skill_start_${Date.now()}_${Math.random()}`,
      type: "skill_start",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理技能释放事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onSkillCast(data: any): void {
    const event: MemberEvent = {
      id: `skill_cast_${Date.now()}_${Math.random()}`,
      type: "skill_cast",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理技能效果事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onSkillEffect(data: any): void {
    const event: MemberEvent = {
      id: `skill_effect_${Date.now()}_${Math.random()}`,
      type: "skill_effect",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理技能结束事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onSkillEnd(data: any): void {
    const event: MemberEvent = {
      id: `skill_end_${Date.now()}_${Math.random()}`,
      type: "skill_end",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理移动事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onMove(data: any): void {
    const event: MemberEvent = {
      id: `move_${Date.now()}_${Math.random()}`,
      type: "move",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理伤害事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onDamage(data: any): void {
    const event: MemberEvent = {
      id: `damage_${Date.now()}_${Math.random()}`,
      type: "damage",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理治疗事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onHeal(data: any): void {
    const event: MemberEvent = {
      id: `heal_${Date.now()}_${Math.random()}`,
      type: "heal",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理Buff添加事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onBuffAdd(data: any): void {
    const event: MemberEvent = {
      id: `buff_add_${Date.now()}_${Math.random()}`,
      type: "buff_add",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理Buff移除事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onBuffRemove(data: any): void {
    const event: MemberEvent = {
      id: `buff_remove_${Date.now()}_${Math.random()}`,
      type: "buff_remove",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理死亡事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onDeath(data: any): void {
    const event: MemberEvent = {
      id: `death_${Date.now()}_${Math.random()}`,
      type: "death",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 处理自定义事件
   * 供FrameLoop调用
   * 
   * @param data 事件数据
   */
  onCustomEvent(data: any): void {
    const event: MemberEvent = {
      id: `custom_${Date.now()}_${Math.random()}`,
      type: "custom",
      timestamp: this.lastUpdateTimestamp,
      data
    };
    this.addEvent(event);
  }

  /**
   * 设置目标
   * 供引擎和控制器使用
   * 
   * @param target 目标成员
   */
  setTarget(target: Member | null): void {
    this.target = target;
    if (target) {
      console.log(`🎯 ${this.getName()} 设置目标: ${target.getName()}`);
    } else {
      console.log(`🎯 ${this.getName()} 清除目标`);
    }
  }

  /**
   * 获取目标
   * 
   * @returns 当前目标
   */
  getTarget(): Member | null {
    return this.target;
  }

  /**
   * 检查是否有目标
   * 
   * @returns 是否有目标
   */
  hasTarget(): boolean {
    return this.target !== null;
  }

  /**
   * 获取目标距离
   * 
   * @returns 与目标的距离，如果没有目标则返回Infinity
   */
  getTargetDistance(): number {
    if (!this.target) {
      return Infinity;
    }

    const myPos = this.getStats().position;
    const targetPos = this.target.getStats().position;
    
    const dx = myPos.x - targetPos.x;
    const dy = myPos.y - targetPos.y;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 检查是否在目标范围内
   * 
   * @param range 范围
   * @returns 是否在范围内
   */
  isInTargetRange(range: number): boolean {
    return this.getTargetDistance() <= range;
  }

  /**
   * 获取朝向目标的方向
   * 
   * @returns 方向角度（弧度），如果没有目标则返回0
   */
  getTargetDirection(): number {
    if (!this.target) {
      return 0;
    }

    const myPos = this.getStats().position;
    const targetPos = this.target.getStats().position;
    
    const dx = targetPos.x - myPos.x;
    const dy = targetPos.y - myPos.y;
    
    return Math.atan2(dy, dx);
  }

  /**
   * 面向目标
   * 调整朝向以面向目标
   */
  faceTarget(): void {
    if (this.target) {
      const direction = this.getTargetDirection();
      // 这里可以添加朝向调整的逻辑
      console.log(`🔄 ${this.getName()} 面向目标: ${this.target.getName()}`);
    }
  }

  /**
   * 获取成员状态摘要
   * 供引擎快照使用
   * 
   * @returns 状态摘要
   */
  getStateSummary(): {
    id: string;
    name: string;
    type: string;
    isAlive: boolean;
    isActive: boolean;
    currentHp: number;
    maxHp: number;
    currentMp: number;
    maxMp: number;
    position: { x: number; y: number };
    state: string;
    targetId?: string;
  } {
    const stats = this.getStats();
    const state = this.getCurrentState();
    
    return {
      id: this.getId(),
      name: this.getName(),
      type: this.getType(),
      isAlive: this.isAlive(),
      isActive: this.isActive(),
      currentHp: stats.currentHp,
      maxHp: stats.maxHp,
      currentMp: stats.currentMp,
      maxMp: stats.maxMp,
      position: stats.position,
      state: state.value,
      targetId: this.target?.getId(),
    };
  }

  /**
   * 获取成员详细信息
   * 供调试和分析使用
   * 
   * @returns 详细信息
   */
  getDetailedInfo(): {
    id: string;
    name: string;
    type: string;
    stats: MemberBaseStats;
    state: any;
    target: string | null;
    eventQueueSize: number;
    lastUpdate: number;
  } {
    return {
      id: this.getId(),
      name: this.getName(),
      type: this.getType(),
      stats: this.getStats(),
      state: this.getCurrentState(),
      target: this.target?.getName() || null,
      eventQueueSize: this.eventQueue.length,
      lastUpdate: this.lastUpdateTimestamp,
    };
  }
}

// ============================== 成员创建工具 ==============================

/**
 * 创建成员实例的工具函数
 * 根据成员类型创建对应的成员实例
 * 
 * 注意：建议直接使用具体的类构造函数，而不是此工厂函数
 * 例如：new Player(memberData, initialState)
 *
 * @param memberData 成员数据
 * @param initialState 初始状态
 * @returns 成员实例
 * @deprecated 建议直接使用具体的类构造函数
 */
export function createMember(
  memberData: MemberWithRelations,
  initialState: {
    position?: { x: number; y: number };
    currentHp?: number;
    currentMp?: number;
  } = {},
): Member {
  // 根据成员类型创建对应的子类实例
  switch (memberData.type) {
    case "Player":
      // 导入Player类并创建实例
      return new Player(memberData, initialState);

    case "Mob":

    case "Mercenary":

    case "Partner":

    default:
      throw new Error(`不支持的成员类型: ${memberData.type}`);
  }
}

// ============================== 导出 ==============================

export default Member;
