/**
 * 战斗事件处理器 - 处理战斗相关事件
 * 
 * 核心职责：
 * 1. 处理成员伤害、治疗、死亡事件
 * 2. 处理Buff应用和移除
 * 3. 与事件执行器集成进行复杂计算
 * 
 * 设计理念：
 * - 单一职责：每个处理器只处理特定类型的事件
 * - 依赖注入：通过构造函数注入所需的服务
 * - 可测试：处理器逻辑独立，便于单元测试
 */


import type { BaseEvent, EventHandler, ExecutionContext, EventResult } from "../core/EventQueue";
import type GameEngine from "../core/GameEngine";
import type { MemberManager } from "../core/MemberManager";
import { ModifierType } from "../core/member/ReactiveSystem";

// ============================== 战斗事件处理器 ==============================

/**
 * 成员伤害事件处理器
 */
export class MemberDamageHandler implements EventHandler {
  constructor(
    private gameEngine: GameEngine, 
    private memberManager: MemberManager
  ) {}

  canHandle(event: BaseEvent): boolean {
    return event.type === 'member_damage';
  }

  execute(event: BaseEvent, context: ExecutionContext): EventResult {
    try {
      const payload = event.payload as any;
      console.log(`处理伤害事件: ${event.id}`, payload);
      
      // 获取目标和施法者（使用注册表条目与 Actor 弱关联）
      const targetEntry = this.memberManager.getMember(payload.targetId);
      const casterEntry = payload.sourceId ? this.memberManager.getMember(payload.sourceId) : null;

      if (!targetEntry) {
        return {
          success: false,
          error: `目标不存在: ${payload.targetId}`,
        };
      }

      // 计算伤害
      const damageExpression = payload.damageExpression || "100";
      const finalDamage = this.gameEngine.evaluateExpression(damageExpression, {
        currentFrame: context.currentFrame,
        casterId: payload.sourceId || "",
        targetId: payload.targetId,
        skillLv: payload.skillLv || 0,
        environment: {
          caster: casterEntry,
          target: targetEntry,
          skill: payload.skillId ? { id: payload.skillId } : undefined,
        }
      });
      
      const finalDamageValue = Math.max(0, Math.floor(finalDamage));

      // 通过响应式系统应用伤害（作为静态固定修饰符的负值）
      const hpBefore = targetEntry.rs.getValue("hp.current" );
      targetEntry.rs.addModifier(
        "hp.current" ,
        ModifierType.STATIC_FIXED,
        -finalDamageValue,
        {
          id: `damage_${event.id}`,
          name: "member_damage",
          type: "system",
        },
      );
      const hpAfter = targetEntry.rs.getValue("hp.current" );

      console.log(`目标 ${payload.targetId} 受到 ${finalDamageValue} 点伤害: ${hpBefore} -> ${hpAfter}`);
      
      const newEvents: BaseEvent[] = [];
      if (hpAfter <= 0) {
        newEvents.push({
          id: `${event.id}_hp_zero`,
          executeFrame: context.currentFrame,
          priority: 'critical',
          type: 'member_fsm_event',
          payload: {
            targetMemberId: payload.targetId,
            fsmEventType: 'hp_zero',
            data: { sourceId: payload.sourceId },
          },
          source: event.source,
          actionId: event.actionId,
        });
      }

      return {
        success: true,
        data: {
          ...payload,
          actualDamage: finalDamageValue,
          targetCurrentHp: hpAfter,
        },
        newEvents,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 成员治疗事件处理器
 */
export class MemberHealHandler implements EventHandler {
  canHandle(event: BaseEvent): boolean {
    return event.type === 'member_heal';
  }

  execute(event: BaseEvent, context: ExecutionContext): EventResult {
    try {
      const payload = event.payload ;
      console.log(`处理治疗事件: ${event.id}`, payload);
      
      // TODO: 实现具体的治疗处理逻辑
      
      return {
        success: true,
        data: payload
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 成员死亡事件处理器
 */
export class MemberDeathHandler implements EventHandler {
  canHandle(event: BaseEvent): boolean {
    return event.type === 'member_death';
  }

  execute(event: BaseEvent, context: ExecutionContext): EventResult {
    try {
      const payload = event.payload ;
      console.log(`处理死亡事件: ${event.id}`, payload);
      
      // TODO: 实现具体的死亡处理逻辑
      
      return {
        success: true,
        data: payload
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Buff应用事件处理器
 */
export class BuffApplyHandler implements EventHandler {
  canHandle(event: BaseEvent): boolean {
    return event.type === 'buff_apply';
  }

  execute(event: BaseEvent, context: ExecutionContext): EventResult {
    try {
      const payload = event.payload ;
      console.log(`处理Buff应用事件: ${event.id}`, payload);
      
      // TODO: 实现具体的Buff应用处理逻辑
      
      return {
        success: true,
        data: payload
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Buff移除事件处理器
 */
export class BuffRemoveHandler implements EventHandler {
  canHandle(event: BaseEvent): boolean {
    return event.type === 'buff_remove';
  }

  execute(event: BaseEvent, context: ExecutionContext): EventResult {
    try {
      const payload = event.payload ;
      console.log(`处理Buff移除事件: ${event.id}`, payload);
      
      // TODO: 实现具体的Buff移除处理逻辑
      
      return {
        success: true,
        data: payload
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}