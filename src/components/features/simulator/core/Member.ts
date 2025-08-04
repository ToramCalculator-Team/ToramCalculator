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

import { createActor, type Actor, type NonReducibleUnknown, type EventObject, type StateMachine } from "xstate";
import type { MemberWithRelations } from "@db/repositories/member";
import { type MemberType } from "@db/schema/enums";
import type { FSMEventBridge, FSMEventInput, FSMTransformContext } from "./fsmBridge/BridgeInterface";
import type { EventQueue } from "./EventQueue";
import { ReactiveSystem, type AttributeExpression } from "./member/ReactiveSystem";
import type GameEngine from "./GameEngine";

// ============================== 类型定义 ==============================

/**
 * 通用属性类型 - 所有成员共有的属性
 * 包括生命值、魔法值、位置等基础属性
 */
export type CommonAttrType = 
  | 'currentHp'    // 当前生命值
  | 'maxHp'        // 最大生命值
  | 'currentMp'    // 当前魔法值
  | 'maxMp'        // 最大魔法值
  | 'positionX'    // X坐标
  | 'positionY'    // Y坐标
  | 'mspd'         // 移动速度
  | 'pAtk'         // 物理攻击力
  | 'mAtk'         // 魔法攻击力
  | 'pDef'         // 物理防御力
  | 'mDef';        // 魔法防御力

/**
 * 通用属性的默认表达式映射
 * 定义通用属性的计算表达式和依赖关系
 */
export const CommonAttrExpressions = new Map<CommonAttrType, AttributeExpression<CommonAttrType>>([
  // 基础属性（无依赖）
  ['maxHp', { expression: 'maxHp', isBase: true }],
  ['maxMp', { expression: 'maxMp', isBase: true }],
  ['positionX', { expression: 'positionX', isBase: true }],
  ['positionY', { expression: 'positionY', isBase: true }],
  ['pAtk', { expression: 'pAtk', isBase: true }],
  ['mAtk', { expression: 'mAtk', isBase: true }],
  ['pDef', { expression: 'pDef', isBase: true }],
  ['mDef', { expression: 'mDef', isBase: true }],
  
  // 计算属性（有依赖）
  ['currentHp', { expression: 'min(currentHp, maxHp)', isBase: false }],
  ['currentMp', { expression: 'min(currentMp, maxMp)', isBase: false }],
]);

/**
 * 成员数据接口 - 对应Member.serialize()的返回类型
 * 
 * @template TAttrKey 属性键的字符串联合类型，与 MemberContext 保持一致
 */
export interface MemberSerializeData<TAttrKey extends string = string> {
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
  state: { value: string; context: MemberContext<TAttrKey> };
  targetId?: string;
  teamId: string;
  campId?: string;
}

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

// 响应式系统已迁移到 ReactiveSystem.ts

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
  pAtk: number;
  /** 魔法攻击力 */
  mAtk: number;
  /** 物理防御力 */
  pDef: number;
  /** 魔法防御力 */
  mDef: number;
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
 *
 * 设计原则：
 * - 单一事实来源：stats 直接引用响应式系统的计算结果
 * - 实时更新：状态机持有引用，自动获取最新值
 * - 性能优化：避免重复计算，直接使用缓存结果
 * - 类型安全：通过泛型 TAttrKey 确保 stats 的类型安全
 *
 * @template TAttrKey 属性键的字符串联合类型，对应响应式系统的属性键
 */
export interface MemberContext<TAttrKey extends string = string> {
  /** 成员基础数据（来自数据库） */
  memberData: MemberWithRelations;
  /** 成员基础属性 - 直接引用响应式系统的计算结果，类型安全 */
  stats: Record<TAttrKey, number>;
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
  /** 位置坐标 */
  position: { x: number; y: number };
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
 * 基础事件类型，所有成员类型都支持的事件
 */
export type MemberEventType =
  | { type: "spawn" } // 生成事件
  | { type: "death" } // 死亡事件
  | { type: "damage"; damage: number; damageType: string; sourceId?: string } // 受到伤害
  | { type: "heal"; heal: number; sourceId?: string } // 治疗事件
  | { type: "skill_start"; skillId: string; targetId?: string } // 技能开始
  | { type: "skill_end" } // 技能结束
  | { type: "move"; position: { x: number; y: number } } // 移动事件
  | { type: "status_effect"; effect: string; duration: number } // 状态效果
  | { type: "update" } // 更新事件
  | { type: string; data: Record<string, any> }; // 自定义事件

/**
 * 成员状态机类型
 * 基于 XState StateMachine 类型，提供完整的类型推断
 * 使用泛型参数允许子类扩展事件类型
 * 
 * @template TAttrKey 属性键的字符串联合类型
 */
export type MemberStateMachine<TAttrKey extends string = string> = StateMachine<
  MemberContext<TAttrKey>, // TContext - 状态机上下文
  MemberEventType, // TEvent - 事件类型（可扩展）
  Record<string, any>, // TChildren - 子状态机
  any, // TActor - Actor配置
  any, // TAction - 动作配置
  any, // TGuard - 守卫配置
  string, // TDelay - 延迟配置
  {}, // TStateValue - 状态值
  string, // TTag - 标签
  NonReducibleUnknown, // TInput - 输入类型
  MemberContext<TAttrKey>, // TOutput - 输出类型（当状态机完成时）
  EventObject, // TEmitted - 发出的事件类型
  any, // TMeta - 元数据
  any // TStateSchema - 状态模式
>;

/**
 * 成员Actor类型
 * 基于 XState Actor 类型，提供完整的类型推断
 * 使用泛型参数允许子类扩展事件类型
 * 
 * @template TAttrKey 属性键的字符串联合类型
 */
export type MemberActor<TAttrKey extends string = string> = Actor<MemberStateMachine<TAttrKey>>;

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
 * 
 * @template TAttrKey 属性键的字符串联合类型，用于类型安全的属性访问
 */
export abstract class Member<TAttrKey extends string = string> {
  // ==================== 核心属性 ====================

  /** 成员唯一标识符 */
  protected readonly id: string;

  /** 成员类型 */
  protected readonly type: MemberType;

  /** 成员目标 */
  protected target: Member | null = null;

  /** XState状态机实例 */
  protected actor: MemberActor<TAttrKey>;

  /** 事件队列 */
  protected eventQueue: MemberEvent[] = [];

  /** 最后更新时间戳 */
  protected lastUpdateTimestamp: number = 0;

  /** 阵营ID */
  protected campId: string | undefined;

  /** 队伍ID */
  protected teamId: string;

  /** 响应式数据管理器 - 统一管理所有属性计算 */
  protected reactiveDataManager!: ReactiveSystem<TAttrKey>;

  // ==================== FSM事件桥集成 ====================

  /** 游戏引擎实例 - 提供所有核心服务的访问 */
  protected readonly engine: GameEngine;

  /** FSM事件桥接器 */
  protected fsmBridge: FSMEventBridge;

  /** 当前帧号 */
  protected currentFrame: number = 0;

  // ==================== 响应式系统集成 ====================

  protected reactiveSystemConfig: {
    attrKeys: TAttrKey[];
    attrExpressions: Map<TAttrKey, AttributeExpression<TAttrKey>>;
  } = {
    attrKeys: [],
    attrExpressions: new Map(),
  };

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   *
   * @param memberData 成员基础数据
   * @param engine 游戏引擎实例 - 提供所有核心服务访问
   * @param fsmBridge FSM事件桥接器（依赖注入）
   * @param reactiveSystemConfig 响应式系统配置
   * @param initialState 初始状态配置
   */
  constructor(
    protected readonly memberData: MemberWithRelations,
    engine: GameEngine,
    fsmBridge: FSMEventBridge,
    reactiveSystemConfig: {
      attrKeys: TAttrKey[];
      attrExpressions: Map<TAttrKey, AttributeExpression<TAttrKey>>;
    },
    initialState: {
      position?: { x: number; y: number };
      currentHp?: number;
      currentMp?: number;
    } = {},
  ) {
    this.id = memberData.id;
    this.type = memberData.type;
    this.teamId = memberData.teamId;

    // 注入游戏引擎 - 核心依赖
    this.engine = engine;

    // 初始化FSM事件桥
    this.fsmBridge = fsmBridge;

    // 初始化响应式配置
    this.reactiveSystemConfig = reactiveSystemConfig;

    // 初始化响应式数据管理器
    this.initializeReactiveSystem(initialState, reactiveSystemConfig);

    // 创建状态机实例
    this.actor = createActor(this.createStateMachine(initialState), {
      input: initialState,
    });

    // 启动状态机
    this.actor.start();

    console.log(`Member: 创建成员: ${memberData.name} (${this.type})，通过引擎访问服务，使用事件桥: ${fsmBridge.getName()}`);
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
   * 子类必须实现此方法来创建特定的状态机
   *
   * @param initialState 初始状态配置
   * @returns 状态机
   */
  protected abstract createStateMachine(initialState: {
    position?: { x: number; y: number };
    currentHp?: number;
    currentMp?: number;
  }): MemberStateMachine;


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
  getCurrentState(): { value: string; context: MemberContext<TAttrKey> } {
    const snapshot = this.actor.getSnapshot();
    
    // 构建基于响应式系统的上下文
    const reactiveContext: MemberContext<TAttrKey> = {
      memberData: this.memberData,
      stats: this.getStats(), // 直接从响应式系统获取最新属性
      isAlive: this.isAlive(),
      isActive: this.isActive(),
      statusEffects: [],
      eventQueue: [],
      lastUpdateTimestamp: Date.now(),
      extraData: {},
      position: this.getPosition(),
    };
    
    // XState v5的Snapshot结构不同，需要正确访问状态
    if (snapshot.status === "active") {
      return {
        value: "active",
        context: reactiveContext,
      };
    }
    return { 
      value: snapshot.status, 
      context: reactiveContext 
    };
  }

  /**
   * 获取默认上下文
   */
  private getDefaultContext(): MemberContext {
    return {
      memberData: this.memberData,
      stats: {},
      isAlive: true,
      isActive: true,
      statusEffects: [],
      eventQueue: [],
      lastUpdateTimestamp: 0,
      extraData: {},
      position: { x: 0, y: 0 },
    };
  }

  /**
   * 获取成员属性
   * 直接从响应式系统获取计算结果，子类实现具体逻辑
   */
  abstract getStats(): Record<TAttrKey, number>;

  /**
   * 获取当前生命值
   */
  getCurrentHp(): number {
    const stats = this.getStats();
    return (stats as any).currentHp || (stats as any).hp || 0;
  }

  /**
   * 获取最大生命值
   */
  getMaxHp(): number {
    const stats = this.getStats();
    return (stats as any).maxHp || (stats as any).MAX_HP || 0;
  }

  /**
   * 获取当前魔法值
   */
  getCurrentMp(): number {
    const stats = this.getStats();
    return (stats as any).currentMp || (stats as any).mp || 0;
  }

  /**
   * 获取最大魔法值
   */
  getMaxMp(): number {
    const stats = this.getStats();
    return (stats as any).maxMp || (stats as any).MAX_MP || 0;
  }

  /**
   * 获取位置信息
   */
  getPosition(): { x: number; y: number } {
    const stats = this.getStats();
    return {
      x: (stats as any).positionX || 0,
      y: (stats as any).positionY || 0,
    };
  }



  /**
   * 检查是否存活
   */
  isAlive(): boolean {
    try {
      if (!this.actor) return true;
      const snapshot = this.actor.getSnapshot();
      return snapshot.status === "active" && snapshot.context ? snapshot.context.isAlive : true;
    } catch (error) {
      console.error(`Member: ${this.getName()} 检查存活状态时发生错误:`, error);
      return true;
    }
  }

  /**
   * 检查是否可行动
   */
  isActive(): boolean {
    try {
      if (!this.actor) return true;
      const snapshot = this.actor.getSnapshot();
      return snapshot.status === "active" && snapshot.context ? snapshot.context.isActive : true;
    } catch (error) {
      console.error(`Member: ${this.getName()} 检查活动状态时发生错误:`, error);
      return true;
    }
  }

  /**
   * 添加事件到队列
   *
   * @param event 要添加的事件
   */
  addEvent(event: MemberEvent): void {
    this.eventQueue.push(event);
    console.log(`Member: 添加事件到队列: ${this.getName()} -> ${event.type}`);
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
    this.actor.send({ type: "update" });

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

  // ==================== FSM事件桥接方法 ====================

  /**
   * 设置当前帧号
   * 用于FSM事件转换时的上下文
   */
  setCurrentFrame(frame: number): void {
    this.currentFrame = frame;
  }

  /**
   * 调用事件桥处理FSM事件
   * 将XState的FSM事件转换为EventQueue事件，并插入到（引擎）事件队列
   *
   * @param fsmEvent FSM事件输入
   * @returns 是否成功处理
   */
  protected processFSMEvent(fsmEvent: FSMEventInput): boolean {
    try {
      // 构建转换上下文
      const context: FSMTransformContext = {
        currentFrame: this.currentFrame,
        memberId: this.id,
        memberType: this.type,
        currentState: this.getCurrentState().value as string,
        targetState: undefined, // 可以根据需要扩展
      };

      // 使用FSM事件桥转换事件
      const queueEvents = this.fsmBridge.transformFSMEvent(fsmEvent, context);

      if (!queueEvents) {
        return true; // 事件被忽略，但不是错误
      }

      // 处理转换结果
      const events = Array.isArray(queueEvents) ? queueEvents : [queueEvents];

      // 如果有外部事件队列，插入到外部队列（引擎事件队列）
      const engineEventQueue = this.engine.getEventQueue();
      if (engineEventQueue) {
        return events.every((event) => engineEventQueue.insert(event));
      }

      // 否则记录日志（未来可能扩展为其他处理方式）
      console.log(`Member ${this.id}: FSM事件已转换，但未设置外部事件队列，生成了 ${events.length} 个事件`);
      return true;
    } catch (error) {
      console.error(`Member ${this.id}: FSM事件处理失败:`, error);
      return false;
    }
  }

  // ==================== 受保护的方法 ====================

  /**
   * 处理单个事件
   *
   * @param event 要处理的事件
   */
  protected processEvent(event: MemberEvent): void {
    // 发送事件到状态机，转换为 XState 事件格式
    this.actor.send({
      type: event.type as any,
      ...event.data,
    });

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

    return `${this.getName()} (${this.type}) - HP: ${this.getCurrentHp()}/${this.getMaxHp()} - 状态: ${state.value}`;
  }

  /**
   * 销毁成员
   * 清理资源并停止状态机
   */
  destroy(): void {
    this.actor.stop();
    this.eventQueue = [];
    console.log(`Member: 销毁成员: ${this.getName()}`);
  }

  // ==================== 引擎标准接口 ====================

  /**
   * 获取状态机实例
   */
  getFSM(): MemberActor {
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
      data,
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
      data,
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
      data,
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
      data,
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
      data,
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
      data,
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
      data,
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
      data,
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
      data,
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
      data,
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
      data,
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
      console.log(`Member: ${this.getName()} 设置目标: ${target.getName()}`);
    } else {
      console.log(`Member: ${this.getName()} 清除目标`);
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
   * 设置阵营ID
   * 供GameEngine调用
   *
   * @param campId 阵营ID
   */
  setCampId(campId: string): void {
    this.campId = campId;
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

    const myPos = this.getPosition();
    const targetPos = this.target.getPosition();

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

    const myPos = this.getPosition();
    const targetPos = this.target.getPosition();

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
      console.log(`Member: ${this.getName()} 面向目标: ${this.target.getName()}`);
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
      currentHp: this.getCurrentHp(),
      maxHp: this.getMaxHp(),
      currentMp: this.getCurrentMp(),
      maxMp: this.getMaxMp(),
      position: this.getPosition(),
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
    stats: Record<TAttrKey, number>;
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

  // ==================== 私有方法 ====================

  /**
   * 初始化响应式系统
   * 合并通用默认属性和子类传入的属性
   */
  private initializeReactiveSystem(
    initialState: {
      position?: { x: number; y: number };
      currentHp?: number;
      currentMp?: number;
    },
    reactiveSystemConfig: {
      attrKeys: TAttrKey[];
      attrExpressions: Map<TAttrKey, AttributeExpression<TAttrKey>>;
    },
  ): void {
    // 使用传入的配置或从子类获取
    const attrKeys = reactiveSystemConfig.attrKeys;
    const attrExpressions = reactiveSystemConfig.attrExpressions;
    
    // 创建响应式系统
    this.reactiveDataManager = new ReactiveSystem<TAttrKey>(attrKeys, attrExpressions);
    
    // 定义通用默认属性
    const commonDefaults: Record<string, number> = {
      currentHp: initialState.currentHp || 1000,
      maxHp: 1000,
      currentMp: initialState.currentMp || 100, 
      maxMp: 100,
      positionX: initialState.position?.x || 0,
      positionY: initialState.position?.y || 0,
      pAtk: 100,
      mAtk: 100,
      pDef: 50,
      mDef: 50,
      mspd: 100,
    };
    
    // 获取子类默认值
    const childDefaults = this.getDefaultAttrValues();
    
    // 合并：子类值覆盖通用值
    const mergedDefaults = { ...commonDefaults, ...childDefaults };
    
    // 设置基础值
    // this.reactiveDataManager.setBaseValues(mergedDefaults as Record<TAttrKey, number>);
    
    console.log(`✅ ReactiveSystem 初始化完成 - ${this.getName()}`);
    
    // 输出依赖关系图（由响应式系统自身处理）
    // this.reactiveDataManager.outputDependencyGraph(this.getName(), this.getType());
  }

  /**
   * 获取子类默认属性值
   * 子类可以重写此方法来覆盖通用属性的默认值，默认返回空对象
   */
  protected getDefaultAttrValues(): Record<string, number> {
    return {};
  }



  /**
   * 序列化成员数据为可传输的纯数据对象
   * 用于Worker与主线程之间的数据传输
   * 只包含可序列化的数据，不包含方法、状态机实例等
   */
  serialize(): MemberSerializeData<TAttrKey> {
    const serializeData: MemberSerializeData<TAttrKey> = {
      id: this.getId(),
      name: this.getName(),
      type: this.getType(),
      isAlive: this.isAlive(),
      isActive: this.isActive(),
      currentHp: this.getCurrentHp(),
      maxHp: this.getMaxHp(),
      currentMp: this.getCurrentMp(),
      maxMp: this.getMaxMp(),
      position: this.getPosition(),
      state: this.getCurrentState(),
      targetId: this.target?.getId(),
      teamId: this.teamId,
      campId: this.campId,
    };
    return serializeData;
  }
}

// ============================== 导出 ==============================

export default Member;
