/**
 * Player专用FSM事件桥接器
 * 
 * 专门处理Player类型成员的FSM事件转换
 * 包含玩家特有的事件类型和转换逻辑
 */

import { createId } from '@paralleldrive/cuid2';
import type { FSMEventBridge, FSMEventInput, FSMTransformContext, FSMTransformResult, StatefulFSMEventBridge, FSMBridgeStats } from './BridgeInterface';
import type { BaseEvent } from '../EventQueue';

// ============================== Player事件类型定义 ==============================

/**
 * Player特有的事件类型
 * 扩展基础事件类型，包含Player特有的状态机事件
 */
export type PlayerEventType =
  | { type: "spawn" }
  | { type: "death" }
  | { type: "damage"; damage: number; damageType: string; sourceId?: string }
  | { type: "heal"; heal: number; sourceId?: string }
  | { type: "skill_start"; skillId: string; targetId?: string }
  | { type: "skill_end" }
  | { type: "move"; position: { x: number; y: number } }
  | { type: "status_effect"; effect: string; duration: number }
  | { type: "update"; timestamp: number }
  // Player特有事件
  | { type: "cast_end"; skillId: string }
  | { type: "controlled"; controllerId: string; duration: number }
  | { type: "move_command"; position: { x: number; y: number } }
  | { type: "charge_end"; skillId: string }
  | { type: "hp_zero" }
  | { type: "stop_move" }
  | { type: "control_end" }
  | { type: "revive_ready" }
  | { type: "skill_press"; skillId: string }
  | { type: "check_availability"; skillId: string }
  | { type: "skill_animation_end"; skillId: string }
  | { type: "custom"; action: string; data?: any };


// ============================== Player FSM事件桥接器 ==============================

/**
 * Player FSM事件桥接器
 * 专门处理Player相关的状态机事件转换
 * 
 * 架构设计：
 * - 实现FSMEventBridge接口，遵循依赖倒置原则
 * - 无状态设计，所有上下文通过参数传递
 * - 专注单一职责：FSM事件转换
 */
export class PlayerFSMEventBridge implements StatefulFSMEventBridge {
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
    // Player特有事件类型
    'cast_end', 'controlled', 'move_command', 'charge_end', 'hp_zero',
    'stop_move', 'control_end', 'revive_ready', 'skill_press',
    'check_availability', 'skill_animation_end', 'custom'
  ]);
  // ==================== 接口实现 ====================

  /**
   * 获取桥接器名称
   */
  getName(): string {
    return 'PlayerFSMEventBridge';
  }

  /**
   * 检查是否支持该事件类型
   */
  supportsEventType(eventType: string): boolean {
    return this.supportedEventTypes.has(eventType);
  }

  /**
   * 获取统计信息
   */
  getStats(): FSMBridgeStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      successfulTransforms: 0,
      skippedEvents: 0,
      failedTransforms: 0
    };
  }

  /**
   * 转换FSM事件为EventQueue事件
   * 核心接口方法实现
   */
  transformFSMEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    this.stats.totalEvents++;

    try {
      // 检查事件类型支持
      if (!this.supportsEventType(fsmEvent.type)) {
        this.stats.skippedEvents++;
        return null;
      }

      // 执行具体的事件转换
      const result = this.transformSpecificEvent(fsmEvent, context);
      
      if (result) {
        this.stats.successfulTransforms++;
      } else {
        this.stats.skippedEvents++;
      }

      return result;
    } catch (error) {
      console.error(`PlayerFSMEventBridge: 转换事件失败:`, error);
      this.stats.failedTransforms++;
      return null;
    }
  }

  // ==================== 私有转换方法 ====================

  /**
   * 转换特定事件
   * 内部方法，处理具体的转换逻辑
   */
  private transformSpecificEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    switch (fsmEvent.type) {
      case 'skill_start':
        return this.transformSkillStartEvent(fsmEvent, context);
      
      case 'skill_press':
        return this.transformSkillPressEvent(fsmEvent, context);
      
      case 'cast_end':
        return this.transformCastEndEvent(fsmEvent, context);
      
      case 'move_command':
        return this.transformMoveCommandEvent(fsmEvent, context);
      
      case 'damage':
        return this.transformDamageEvent(fsmEvent, context);
      
      case 'heal':
        return this.transformHealEvent(fsmEvent, context);
      
      case 'controlled':
        return this.transformControlledEvent(fsmEvent, context);
      
      case 'hp_zero':
        return this.transformHpZeroEvent(fsmEvent, context);
      
      case 'charge_end':
        return this.transformChargeEndEvent(fsmEvent, context);
      
      case 'skill_animation_end':
        return this.transformSkillAnimationEndEvent(fsmEvent, context);
      
      case 'custom':
        return this.transformCustomEvent(fsmEvent, context);
      
      default:
        // 对于通用事件，使用默认转换
        return this.createDefaultEvent(fsmEvent, context);
    }
  }

  // ==================== 特定事件转换方法 ====================

  /**
   * 转换技能开始事件
   */
  private transformSkillStartEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const skillData = fsmEvent.data as { skillId: string; targetId?: string };
    
    return [
      // 技能前摇开始事件
      {
        id: createId(),
        type: 'player_skill_cast_start',
        priority: 'high' as const,
        executeFrame: context.currentFrame,
        payload: {
          memberId: context.memberId,
          skillId: skillData.skillId,
          targetId: skillData.targetId,
          actionId: fsmEvent.actionId
        }
      },
      // 技能前摇结束事件（延迟执行）
      {
        id: createId(),
        type: 'player_skill_cast_end',
        priority: 'high' as const,
        executeFrame: context.currentFrame + this.getSkillCastFrames(skillData.skillId),
        payload: {
          memberId: context.memberId,
          skillId: skillData.skillId,
          targetId: skillData.targetId,
          actionId: fsmEvent.actionId
        }
      }
    ];
  }

  /**
   * 创建默认事件（通用事件转换）
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

  /**
   * 转换技能按下事件
   */
  private transformSkillPressEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const skillData = fsmEvent.data as { skillId: string };
    
    return {
      id: createId(),
      type: 'player_skill_input',
      priority: 'high' as const,
      executeFrame: context.currentFrame,
      payload: {
        memberId: context.memberId,
        skillId: skillData.skillId,
        inputTime: context.currentFrame
      }
    };
  }

  /**
   * 转换前摇结束事件
   */
  private transformCastEndEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const skillData = fsmEvent.data as { skillId: string };
    
    return {
      id: createId(),
      type: 'player_skill_execute',
      priority: 'critical' as const,
      executeFrame: context.currentFrame,
      payload: {
        memberId: context.memberId,
        skillId: skillData.skillId,
        executionFrame: context.currentFrame
      }
    };
  }

  /**
   * 转换移动指令事件
   */
  private transformMoveCommandEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const moveData = fsmEvent.data as { position: { x: number; y: number } };
    
    return {
      id: createId(),
      type: 'player_movement',
      priority: 'normal' as const,
      executeFrame: context.currentFrame,
      payload: {
        memberId: context.memberId,
        targetPosition: moveData.position,
        startFrame: context.currentFrame
      }
    };
  }

  /**
   * 转换伤害事件
   */
  private transformDamageEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const damageData = fsmEvent.data as { damage: number; damageType: string; sourceId?: string };
    
    return {
      id: createId(),
      type: 'player_take_damage',
      priority: 'high' as const,
      executeFrame: context.currentFrame,
      payload: {
        memberId: context.memberId,
        damage: damageData.damage,
        damageType: damageData.damageType,
        sourceId: damageData.sourceId,
        damageFrame: context.currentFrame
      }
    };
  }

  /**
   * 转换治疗事件
   */
  private transformHealEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const healData = fsmEvent.data as { heal: number; sourceId?: string };
    
    return {
      id: createId(),
      type: 'player_receive_heal',
      priority: 'high' as const,
      executeFrame: context.currentFrame,
      payload: {
        memberId: context.memberId,
        heal: healData.heal,
        sourceId: healData.sourceId,
        healFrame: context.currentFrame
      }
    };
  }

  /**
   * 转换被控制事件
   */
  private transformControlledEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const controlData = fsmEvent.data as { controllerId: string; duration: number };
    
    return [
      // 控制开始事件
      {
        id: createId(),
        type: 'player_control_start',
        priority: 'critical' as const,
        executeFrame: context.currentFrame,
        payload: {
          memberId: context.memberId,
          controllerId: controlData.controllerId,
          duration: controlData.duration
        }
      },
      // 控制结束事件（延迟执行）
      {
        id: createId(),
        type: 'player_control_end',
        priority: 'critical' as const,
        executeFrame: context.currentFrame + controlData.duration,
        payload: {
          memberId: context.memberId,
          controllerId: controlData.controllerId
        }
      }
    ];
  }

  /**
   * 转换HP归零事件
   */
  private transformHpZeroEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    return {
      id: createId(),
      type: 'player_death',
      priority: 'critical' as const,
      executeFrame: context.currentFrame,
      payload: {
        memberId: context.memberId,
        deathFrame: context.currentFrame,
        deathCause: 'hp_zero'
      }
    };
  }

  /**
   * 转换蓄力结束事件
   */
  private transformChargeEndEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const chargeData = fsmEvent.data as { skillId: string };
    
    return {
      id: createId(),
      type: 'player_skill_charge_complete',
      priority: 'high' as const,
      executeFrame: context.currentFrame,
      payload: {
        memberId: context.memberId,
        skillId: chargeData.skillId,
        chargeCompleteFrame: context.currentFrame
      }
    };
  }

  /**
   * 转换技能动画结束事件
   */
  private transformSkillAnimationEndEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    const animData = fsmEvent.data as { skillId: string };
    
    return {
      id: createId(),
      type: 'player_skill_animation_complete',
      priority: 'normal' as const,
      executeFrame: context.currentFrame,
      payload: {
        memberId: context.memberId,
        skillId: animData.skillId,
        animationEndFrame: context.currentFrame
      }
    };
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取技能前摇帧数
   * 
   * @param skillId 技能ID
   * @returns 前摇帧数
   */
  private getSkillCastFrames(skillId: string): number {
    // 简化实现，实际应该从技能数据中获取
    const skillCastTimes: Record<string, number> = {
      'attack': 30,      // 0.5秒前摇
      'fireball': 60,    // 1秒前摇
      'heal': 90,        // 1.5秒前摇
      'shield': 45,      // 0.75秒前摇
    };
    
    return skillCastTimes[skillId] || 30; // 默认0.5秒前摇
  }

  /**
   * 转换自定义事件
   */
  private transformCustomEvent(fsmEvent: FSMEventInput, context: FSMTransformContext): FSMTransformResult {
    console.log(`🔄 PlayerFSMEventBridge: 转换自定义事件`, fsmEvent);
    
    return {
      id: createId(),
      type: 'custom',
      priority: 'normal' as const,
      executeFrame: context.currentFrame + (fsmEvent.delayFrames || 0),
      payload: {
        targetMemberId: context.memberId,
        memberId: context.memberId,
        action: fsmEvent.data?.action || 'unknown',
        ...fsmEvent.data,
        fsmSource: 'player_bridge',
        originalEvent: fsmEvent.type
      },
      source: fsmEvent.source || 'player_fsm'
    };
  }

  /**
   * 构建Player特有的额外上下文
   */
  protected buildExtraContext(fsmEvent: FSMEventInput): Record<string, any> {
    return {
      memberType: 'Player',
      playerSpecific: true,
      eventSource: 'player_fsm'
    };
  }
}

export default PlayerFSMEventBridge;