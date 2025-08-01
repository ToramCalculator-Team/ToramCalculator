/**
 * Mob FSM事件桥接器
 * 
 * 专门处理Mob类型成员的FSM事件转换
 * 包含怪物特有的事件类型和转换逻辑
 */

import { createId } from '@paralleldrive/cuid2';
import type { FSMEventBridge, FSMEventInput, FSMTransformContext, FSMTransformResult, StatefulFSMEventBridge, FSMBridgeStats } from './BridgeInterface';
import type { BaseEvent } from '../EventQueue';

// ============================== Mob事件类型定义 ==============================

/**
 * Mob特有的事件类型
 * 主要涉及AI行为、巡逻、追击等
 */
export type MobEventType = 
  | "ai_decision"           // AI决策
  | "patrol"                // 巡逻
  | "chase"                 // 追击
  | "alert"                 // 警戒
  | "retreat"               // 撤退
  | "enrage"                // 狂暴
  | "respawn"               // 重生
  | "territory_check";      // 领域检查

// ============================== Mob FSM事件桥接器 ==============================

/**
 * Mob FSM事件桥接器
 * 专门处理Mob相关的状态机事件转换
 * 
 * 架构设计：
 * - 实现FSMEventBridge接口，遵循依赖倒置原则
 * - 专注于Mob特有的AI行为事件转换
 * - 相对于Player更简单的事件处理逻辑
 */
export class MobFSMEventBridge implements StatefulFSMEventBridge {
  // ==================== 私有属性 ====================

  private stats: FSMBridgeStats = {
    totalEvents: 0,
    successfulTransforms: 0,
    skippedEvents: 0,
    failedTransforms: 0
  };

  private readonly supportedEventTypes = new Set([
    'spawn', 'death', 'damage', 'heal', 'skill_start', 'skill_end',
    'move', 'status_effect', 'update',
    // Mob特有事件类型
    'ai_decision', 'patrol', 'chase', 'alert', 'retreat',
    'enrage', 'respawn', 'territory_check'
  ]);

  // ==================== 接口实现 ====================

  getName(): string {
    return 'MobFSMEventBridge';
  }

  supportsEventType(eventType: string): boolean {
    return this.supportedEventTypes.has(eventType);
  }

  getStats(): FSMBridgeStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      successfulTransforms: 0,
      skippedEvents: 0,
      failedTransforms: 0
    };
  }

  transformFSMEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    this.stats.totalEvents++;

    try {
      if (!this.supportsEventType(fsmEvent.type)) {
        this.stats.skippedEvents++;
        return null;
      }

      const result = this.transformSpecificEvent(fsmEvent, context);
      
      if (result) {
        this.stats.successfulTransforms++;
      } else {
        this.stats.skippedEvents++;
      }

      return result;
    } catch (error) {
      console.error(`MobFSMEventBridge: 转换事件失败:`, error);
      this.stats.failedTransforms++;
      return null;
    }
  }

  // ==================== 私有转换方法 ====================

  /**
   * 转换特定事件
   */
  private transformSpecificEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    switch (fsmEvent.type) {
      case 'ai_decision':
        return this.transformAIDecisionEvent(fsmEvent, context);
      
      case 'patrol':
        return this.transformPatrolEvent(fsmEvent, context);
      
      case 'chase':
        return this.transformChaseEvent(fsmEvent, context);
      
      case 'alert':
        return this.transformAlertEvent(fsmEvent, context);
      
      case 'retreat':
        return this.transformRetreatEvent(fsmEvent, context);
      
      case 'damage':
        return this.transformDamageEvent(fsmEvent, context);
      
      case 'skill_start':
        return this.transformSkillStartEvent(fsmEvent, context);
      
      default:
        return this.createDefaultEvent(fsmEvent, context);
    }
  }

  /**
   * 创建默认事件
   */
  private createDefaultEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    return {
      id: createId(),
      type: fsmEvent.type,
      executeFrame: context.currentFrame + (fsmEvent.delayFrames || 0),
      priority: 'normal',
      payload: {
        memberId: context.memberId,
        memberType: context.memberType,
        sourceEvent: fsmEvent.type,
        data: fsmEvent.data
      }
    };
  }

  // ==================== Mob特有事件转换 ====================

  private transformAIDecisionEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const aiData = fsmEvent.data as { decision: string; targetId?: string };
    
    return {
      id: createId(),
      type: 'mob_ai_execute',
      executeFrame: context.currentFrame + 1,
      priority: 'high',
      payload: {
        memberId: context.memberId,
        aiDecision: aiData.decision,
        targetId: aiData.targetId,
        timestamp: Date.now()
      }
    };
  }

  private transformPatrolEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const patrolData = fsmEvent.data as { patrolPoints: Array<{x: number, y: number}> };
    
    return {
      id: createId(),
      type: 'mob_patrol_start',
      executeFrame: context.currentFrame,
      priority: 'normal',
      payload: {
        memberId: context.memberId,
        patrolRoute: patrolData.patrolPoints,
        speed: 'normal'
      }
    };
  }

  private transformChaseEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const chaseData = fsmEvent.data as { targetId: string; maxDistance?: number };
    
    return {
      id: createId(),
      type: 'mob_chase_start',
      executeFrame: context.currentFrame,
      priority: 'high',
      payload: {
        memberId: context.memberId,
        targetId: chaseData.targetId,
        maxChaseDistance: chaseData.maxDistance || 1000,
        chaseSpeed: 'fast'
      }
    };
  }

  private transformAlertEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const alertData = fsmEvent.data as { alertRadius?: number; duration?: number };
    
    return {
      id: createId(),
      type: 'mob_alert_start',
      executeFrame: context.currentFrame,
      priority: 'normal',
      payload: {
        memberId: context.memberId,
        alertRadius: alertData.alertRadius || 300,
        alertDuration: alertData.duration || 5000
      }
    };
  }

  private transformRetreatEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const retreatData = fsmEvent.data as { retreatPosition?: {x: number, y: number} };
    
    return {
      id: createId(),
      type: 'mob_retreat_start',
      executeFrame: context.currentFrame,
      priority: 'high',
      payload: {
        memberId: context.memberId,
        retreatPosition: retreatData.retreatPosition,
        retreatSpeed: 'fast'
      }
    };
  }

  private transformDamageEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const damageData = fsmEvent.data as { damage: number; sourceId: string };
    
    return [
      // 伤害处理事件
      {
        id: createId(),
        type: 'damage_apply',
        executeFrame: context.currentFrame,
        priority: 'high',
        payload: {
          targetId: context.memberId,
          damage: damageData.damage,
          sourceId: damageData.sourceId
        }
      },
      // Mob受伤反应事件
      {
        id: createId(),
        type: 'mob_damage_reaction',
        executeFrame: context.currentFrame + 1,
        priority: 'normal',
        payload: {
          memberId: context.memberId,
          attackerId: damageData.sourceId,
          damageAmount: damageData.damage
        }
      }
    ];
  }

  private transformSkillStartEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const skillData = fsmEvent.data as { skillId: string; targetId?: string };
    
    return {
      id: createId(),
      type: 'mob_skill_execute',
      executeFrame: context.currentFrame,
      priority: 'high',
      payload: {
        casterId: context.memberId,
        skillId: skillData.skillId,
        targetId: skillData.targetId
      }
    };
  }
}

export default MobFSMEventBridge;