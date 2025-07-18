/**
 * FSM事件桥接器 - 连接XState状态机和EventQueue
 * 
 * 核心职责：
 * 1. 将FSM的Action转换为EventQueue事件
 * 2. 提供状态机事件生成的统一接口
 * 3. 支持事件的中断和清理
 * 
 * 设计理念：
 * - 适配器模式：在FSM和EventQueue之间建立桥梁
 * - 低耦合：不直接依赖具体的状态机实现
 * - 可扩展：支持自定义事件转换规则
 */

import { createId } from '@paralleldrive/cuid2';
import type { EventQueue, BaseEvent } from "./EventQueue";
import { Logger } from "~/utils/logger";

// ============================== 类型定义 ==============================

/**
 * FSM事件接口
 * 从状态机Action生成的事件数据
 */
export interface FSMEvent {
  /** 事件类型 */
  type: string;
  /** 触发的状态机实例ID */
  memberId: string;
  /** 当前状态 */
  currentState: string;
  /** 目标状态 */
  targetState?: string;
  /** 事件数据 */
  data?: any;
  /** 延迟帧数 */
  delayFrames?: number;
  /** 事件来源（用于中断清理） */
  source?: string;
  /** 关联的行为ID（用于中断清理） */
  actionId?: string;
}

/**
 * 事件转换规则接口
 */
export interface EventTransformRule {
  /** 规则名称 */
  name: string;
  /** 匹配条件 */
  matches: (fsmEvent: FSMEvent) => boolean;
  /** 转换函数 */
  transform: (fsmEvent: FSMEvent, currentFrame: number) => BaseEvent | BaseEvent[] | null;
  /** 优先级 */
  priority?: number;
}

/**
 * 桥接器配置接口
 */
export interface FSMEventBridgeConfig {
  /** 是否启用调试日志 */
  enableDebugLog: boolean;
  /** 默认事件优先级 */
  defaultPriority: 'critical' | 'high' | 'normal' | 'low';
  /** 最大延迟帧数 */
  maxDelayFrames: number;
}

// ============================== FSM事件桥接器类 ==============================

/**
 * FSM事件桥接器类
 * 负责将状态机事件转换为队列事件
 */
export class FSMEventBridge {
  // ==================== 私有属性 ====================

  /** 事件队列引用 */
  private eventQueue: EventQueue | null = null;

  /** 事件转换规则 */
  private transformRules: EventTransformRule[] = [];

  /** 桥接器配置 */
  private config: FSMEventBridgeConfig;

  /** 统计信息 */
  private stats = {
    totalEventsProcessed: 0,
    successfulTransforms: 0,
    failedTransforms: 0,
    rulesMatched: new Map<string, number>()
  };

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   * 
   * @param eventQueue 事件队列
   * @param config 桥接器配置
   */
  constructor(eventQueue: EventQueue | null = null, config: Partial<FSMEventBridgeConfig> = {}) {
    this.eventQueue = eventQueue;
    this.config = {
      enableDebugLog: true,
      defaultPriority: 'normal',
      maxDelayFrames: 3600, // 60秒 * 60fps
      ...config
    };

    // 初始化默认转换规则
    this.initializeDefaultRules();

    console.log("FSMEventBridge: 初始化完成", this.config);
  }

  // ==================== 公共接口 ====================

  /**
   * 设置事件队列
   * 
   * @param eventQueue 事件队列
   */
  setEventQueue(eventQueue: EventQueue): void {
    this.eventQueue = eventQueue;
    console.log("FSMEventBridge: 设置事件队列");
  }

  /**
   * 处理FSM事件
   * 将FSM事件转换为EventQueue事件并插入队列
   * 
   * @param fsmEvent FSM事件
   * @param currentFrame 当前帧号
   * @returns 转换是否成功
   */
  processFSMEvent(fsmEvent: FSMEvent, currentFrame: number): boolean {
    if (!this.eventQueue) {
      console.warn("FSMEventBridge: 事件队列未设置");
      return false;
    }

    this.stats.totalEventsProcessed++;

    try {
      // 查找匹配的转换规则
      const matchedRule = this.findMatchingRule(fsmEvent);
      
      if (!matchedRule) {
        // 使用默认转换
        const defaultEvent = this.createDefaultEvent(fsmEvent, currentFrame);
        if (defaultEvent) {
          const success = this.eventQueue.insert(defaultEvent);
          if (success) {
            this.stats.successfulTransforms++;
            if (this.config.enableDebugLog) {
              console.log(`FSMEventBridge: 默认转换成功: ${fsmEvent.type}`, fsmEvent);
            }
          }
          return success;
        } else {
          console.warn(`FSMEventBridge: 无法转换事件: ${fsmEvent.type}`, fsmEvent);
          this.stats.failedTransforms++;
          return false;
        }
      }

      // 应用转换规则
      const transformedEvents = matchedRule.transform(fsmEvent, currentFrame);
      
      if (!transformedEvents) {
        if (this.config.enableDebugLog) {
          console.log(`FSMEventBridge: 规则 ${matchedRule.name} 返回null，跳过事件`);
        }
        return true;
      }

      // 插入转换后的事件
      const events = Array.isArray(transformedEvents) ? transformedEvents : [transformedEvents];
      let successCount = 0;

      for (const event of events) {
        if (this.eventQueue.insert(event)) {
          successCount++;
        }
      }

      const allSuccess = successCount === events.length;
      if (allSuccess) {
        this.stats.successfulTransforms++;
        // 更新规则匹配统计
        const currentCount = this.stats.rulesMatched.get(matchedRule.name) || 0;
        this.stats.rulesMatched.set(matchedRule.name, currentCount + 1);
        
        if (this.config.enableDebugLog) {
          console.log(`FSMEventBridge: 规则 ${matchedRule.name} 转换成功: ${events.length} 个事件`);
        }
      } else {
        this.stats.failedTransforms++;
        console.warn(`FSMEventBridge: 规则 ${matchedRule.name} 部分失败: ${successCount}/${events.length}`);
      }

      return allSuccess;

    } catch (error) {
      this.stats.failedTransforms++;
      console.error("FSMEventBridge: 处理FSM事件异常:", error);
      return false;
    }
  }

  /**
   * 批量处理FSM事件
   * 
   * @param fsmEvents FSM事件数组
   * @param currentFrame 当前帧号
   * @returns 成功处理的事件数量
   */
  processFSMEvents(fsmEvents: FSMEvent[], currentFrame: number): number {
    let successCount = 0;

    for (const fsmEvent of fsmEvents) {
      if (this.processFSMEvent(fsmEvent, currentFrame)) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * 注册事件转换规则
   * 
   * @param rule 转换规则
   */
  registerTransformRule(rule: EventTransformRule): void {
    // 按优先级插入
    const priority = rule.priority || 0;
    let insertIndex = this.transformRules.length;

    for (let i = 0; i < this.transformRules.length; i++) {
      const existingPriority = this.transformRules[i].priority || 0;
      if (priority > existingPriority) {
        insertIndex = i;
        break;
      }
    }

    this.transformRules.splice(insertIndex, 0, rule);
    console.log(`FSMEventBridge: 注册转换规则: ${rule.name} (优先级: ${priority})`);
  }

  /**
   * 注销事件转换规则
   * 
   * @param ruleName 规则名称
   */
  unregisterTransformRule(ruleName: string): void {
    const index = this.transformRules.findIndex(rule => rule.name === ruleName);
    if (index !== -1) {
      this.transformRules.splice(index, 1);
      console.log(`FSMEventBridge: 注销转换规则: ${ruleName}`);
    }
  }

  /**
   * 清除指定来源的事件
   * 
   * @param source 事件来源
   * @returns 清除的事件数量
   */
  clearEventsBySource(source: string): number {
    if (!this.eventQueue) {
      return 0;
    }

    return this.eventQueue.clearEventsBySource(source);
  }

  /**
   * 清除指定行为的事件
   * 
   * @param actionId 行为ID
   * @returns 清除的事件数量
   */
  clearEventsByAction(actionId: string): number {
    if (!this.eventQueue) {
      return 0;
    }

    return this.eventQueue.clearEventsByAction(actionId);
  }

  /**
   * 获取统计信息
   * 
   * @returns 统计信息
   */
  getStats(): any {
    return {
      ...this.stats,
      rulesMatched: Object.fromEntries(this.stats.rulesMatched),
      activeRules: this.transformRules.map(rule => ({
        name: rule.name,
        priority: rule.priority || 0
      }))
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalEventsProcessed: 0,
      successfulTransforms: 0,
      failedTransforms: 0,
      rulesMatched: new Map()
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 查找匹配的转换规则
   * 
   * @param fsmEvent FSM事件
   * @returns 匹配的规则或null
   */
  private findMatchingRule(fsmEvent: FSMEvent): EventTransformRule | null {
    for (const rule of this.transformRules) {
      try {
        if (rule.matches(fsmEvent)) {
          return rule;
        }
      } catch (error) {
        console.error(`FSMEventBridge: 规则 ${rule.name} 匹配检查异常:`, error);
      }
    }
    return null;
  }

  /**
   * 创建默认事件
   * 
   * @param fsmEvent FSM事件
   * @param currentFrame 当前帧号
   * @returns 默认BaseEvent或null
   */
  private createDefaultEvent(fsmEvent: FSMEvent, currentFrame: number): BaseEvent | null {
    try {
      const delayFrames = Math.min(fsmEvent.delayFrames || 0, this.config.maxDelayFrames);
      
      return {
        id: createId(),
        executeFrame: currentFrame + delayFrames,
        priority: this.config.defaultPriority,
        type: fsmEvent.type,
        payload: {
          memberId: fsmEvent.memberId,
          currentState: fsmEvent.currentState,
          targetState: fsmEvent.targetState,
          ...fsmEvent.data
        },
        source: fsmEvent.source || `member_${fsmEvent.memberId}`,
        actionId: fsmEvent.actionId
      };
    } catch (error) {
      console.error("FSMEventBridge: 创建默认事件失败:", error);
      return null;
    }
  }

  /**
   * 初始化默认转换规则
   */
  private initializeDefaultRules(): void {
    // 技能生命周期事件规则
    this.registerTransformRule({
      name: 'skill_lifecycle',
      priority: 10,
      matches: (fsmEvent) => fsmEvent.type.startsWith('skill_') || fsmEvent.type.includes('技能'),
      transform: (fsmEvent, currentFrame) => {
        return this.generateSkillPhaseEvents(fsmEvent, currentFrame);
      }
    });

    // 状态变化事件规则
    this.registerTransformRule({
      name: 'state_change_events',
      priority: 5,
      matches: (fsmEvent) => fsmEvent.targetState !== undefined,
      transform: (fsmEvent, currentFrame) => {
        return {
          id: createId(),
          executeFrame: currentFrame,
          priority: 'normal',
          type: 'state_change',
          payload: {
            memberId: fsmEvent.memberId,
            fromState: fsmEvent.currentState,
            toState: fsmEvent.targetState,
            eventType: fsmEvent.type,
            data: fsmEvent.data
          },
          source: `member_${fsmEvent.memberId}`,
          actionId: fsmEvent.actionId
        };
      }
    });

    // 动画事件规则
    this.registerTransformRule({
      name: 'animation_events',
      priority: 1,
      matches: (fsmEvent) => fsmEvent.type.includes('动画') || fsmEvent.type.includes('animation'),
      transform: (fsmEvent, currentFrame) => {
        const delayFrames = fsmEvent.delayFrames || 0;
        return {
          id: createId(),
          executeFrame: currentFrame + delayFrames,
          priority: 'low',
          type: fsmEvent.type,
          payload: {
            memberId: fsmEvent.memberId,
            animationData: fsmEvent.data
          },
          source: `member_${fsmEvent.memberId}`,
          actionId: fsmEvent.actionId
        };
      }
    });

    console.log("FSMEventBridge: 默认转换规则初始化完成");
  }

  /**
   * 生成技能生命周期事件
   * 
   * @param fsmEvent FSM事件
   * @param currentFrame 当前帧号
   * @returns 技能阶段事件数组
   */
  private generateSkillPhaseEvents(fsmEvent: FSMEvent, currentFrame: number): BaseEvent[] {
    const events: BaseEvent[] = [];
    const skillData = fsmEvent.data as any;
    const memberId = fsmEvent.memberId;
    const actionId = fsmEvent.actionId || createId();

    // 解析技能配置数据
    const skillConfig = this.parseSkillConfig(skillData);

    // 1. 技能开始：记录操作，判断技能可用性
    events.push({
      id: createId(),
      executeFrame: currentFrame,
      priority: 'high',
      type: 'skill_start',
      payload: {
        memberId,
        skillId: skillData.skillId,
        phase: 'start',
        skillData
      },
      source: `member_${memberId}`,
      actionId
    });

    // 2. 前摇开始：修改特定角色状态，计算前摇时长，执行前摇动画
    const prepareStartFrame = currentFrame + (skillConfig.startDelay || 0);
    events.push({
      id: createId(),
      executeFrame: prepareStartFrame,
      priority: 'high',
      type: 'skill_prepare_start',
      payload: {
        memberId,
        skillId: skillData.skillId,
        phase: 'prepare_start',
        duration: skillConfig.prepareDuration,
        lockControls: true
      },
      source: `member_${memberId}`,
      actionId
    });

    // 3. 蓄力开始：修改特定角色状态，计算蓄力时长，执行蓄力动画
    const chargeStartFrame = prepareStartFrame + (skillConfig.prepareDuration || 0);
    events.push({
      id: createId(),
      executeFrame: chargeStartFrame,
      priority: 'high',
      type: 'skill_charge_start',
      payload: {
        memberId,
        skillId: skillData.skillId,
        phase: 'charge_start',
        duration: skillConfig.chargeDuration,
        allowDodge: true
      },
      source: `member_${memberId}`,
      actionId
    });

    // 4. 计算技能效果：执行技能效果，生成事件插入到事件队列
    const effectFrame = chargeStartFrame + (skillConfig.chargeDuration || 0);
    events.push({
      id: createId(),
      executeFrame: effectFrame,
      priority: 'critical',
      type: 'skill_effect',
      payload: {
        memberId,
        skillId: skillData.skillId,
        phase: 'effect',
        effects: skillConfig.effects,
        targets: skillData.targets
      },
      source: `member_${memberId}`,
      actionId
    });

    // 5. 技能动画结束：修改特定角色状态，比如可操作性
    const endFrame = effectFrame + (skillConfig.effectDuration || 0);
    events.push({
      id: createId(),
      executeFrame: endFrame,
      priority: 'normal',
      type: 'skill_end',
      payload: {
        memberId,
        skillId: skillData.skillId,
        phase: 'end',
        restoreControls: true
      },
      source: `member_${memberId}`,
      actionId
    });

    if (this.config.enableDebugLog) {
      console.log(`FSMEventBridge: 生成技能生命周期事件: ${events.length} 个阶段`, {
        skillId: skillData.skillId,
        memberId,
        phases: events.map(e => e.type)
      });
    }

    return events;
  }

  /**
   * 解析技能配置数据
   * 
   * @param skillData 技能数据
   * @returns 解析后的技能配置
   */
  private parseSkillConfig(skillData: any): {
    startDelay: number;
    prepareDuration: number;
    chargeDuration: number;
    effectDuration: number;
    effects: any[];
  } {
    // TODO: 根据实际的技能数据结构解析
    // 这里需要根据角色当前属性计算各阶段的持续时间
    
    return {
      startDelay: 0,                                    // 技能开始延迟
      prepareDuration: skillData.prepareDuration || 30, // 前摇时长（帧数）
      chargeDuration: skillData.chargeDuration || 20,   // 蓄力时长（帧数）
      effectDuration: skillData.effectDuration || 10,   // 效果持续时长（帧数）
      effects: skillData.effects || []                  // 技能效果列表
    };
  }
}

// ============================== 便利函数 ==============================

/**
 * 创建FSM事件的便利函数
 * 
 * @param type 事件类型
 * @param memberId 成员ID
 * @param currentState 当前状态
 * @param options 其他选项
 * @returns FSM事件
 */
export function createFSMEvent(
  type: string,
  memberId: string,
  currentState: string,
  options: Partial<Omit<FSMEvent, 'type' | 'memberId' | 'currentState'>> = {}
): FSMEvent {
  return {
    type,
    memberId,
    currentState,
    ...options
  };
}

/**
 * 创建技能相关FSM事件的便利函数
 * 
 * @param skillEventType 技能事件类型
 * @param memberId 成员ID
 * @param currentState 当前状态
 * @param skillData 技能数据
 * @param delayFrames 延迟帧数
 * @param actionId 行为ID
 * @returns FSM事件
 */
export function createSkillFSMEvent(
  skillEventType: string,
  memberId: string,
  currentState: string,
  skillData: any,
  delayFrames: number = 0,
  actionId?: string
): FSMEvent {
  return createFSMEvent(skillEventType, memberId, currentState, {
    data: skillData,
    delayFrames,
    source: `skill_${memberId}`,
    actionId
  });
}

// ============================== 导出 ==============================

export default FSMEventBridge;