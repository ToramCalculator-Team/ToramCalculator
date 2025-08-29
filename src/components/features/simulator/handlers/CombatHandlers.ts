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
import { ModifierType } from "../core/dataSys/StatContainer";

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

      // 计算伤害（集成 Buff 钩子：before/after/apply）
      const damageExpression = payload.damageExpression || "100";
      // before: 允许 buff 修改乘区/常数/无敌等标志
      const beforeIO: { mul?: number; add?: number; flags?: { invul?: boolean } } = { mul: 1, add: 0 };
      casterEntry?.buffManager?.applyBeforeDamage({ context, payload, event }, beforeIO);
      targetEntry.buffManager?.applyBeforeDamage({ context, payload, event }, beforeIO);

      const baseValue = this.gameEngine.evaluateExpression(damageExpression, {
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
      let computed = Math.max(0, Math.floor(baseValue * (beforeIO.mul ?? 1) + (beforeIO.add ?? 0)));
      if (beforeIO.flags?.invul) computed = 0;

      // after: 封顶/常数等
      const afterIO: { final?: number } = { final: computed };
      casterEntry?.buffManager?.applyAfterDamage({ context, payload, event }, afterIO);
      targetEntry.buffManager?.applyAfterDamage({ context, payload, event }, afterIO);
      const finalDamageValue = Math.max(0, Math.floor(afterIO.final ?? computed));

      // 通过响应式系统应用伤害（作为静态固定修饰符的负值）
      const hpBefore = targetEntry.statContainer.getValue("hp.current" );
      // apply: 允许屏障/保命等改写落账值
      const applyIO: { applied?: number } = { applied: finalDamageValue };
      casterEntry?.buffManager?.applyApplyDamage({ context, payload, event }, applyIO);
      targetEntry.buffManager?.applyApplyDamage({ context, payload, event }, applyIO);
      const appliedDamage = Math.max(0, Math.floor(applyIO.applied ?? finalDamageValue));

      targetEntry.statContainer.addModifier(
        "hp.current" ,
        ModifierType.STATIC_FIXED,
        -appliedDamage,
        {
          id: `damage_${event.id}`,
          name: "member_damage",
          type: "system",
        },
      );
      const hpAfter = targetEntry.statContainer.getValue("hp.current" );

      console.log(`目标 ${payload.targetId} 受到 ${appliedDamage} 点伤害: ${hpBefore} -> ${hpAfter}`);
      
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