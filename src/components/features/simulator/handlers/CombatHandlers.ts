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
import type { EventExecutor, ExpressionContext } from "../core/EventExecutor";
import type { MemberManager } from "../core/MemberManager";

// ============================== 战斗事件处理器 ==============================

/**
 * 成员伤害事件处理器
 */
export class MemberDamageHandler implements EventHandler {
  constructor(
    private eventExecutor: EventExecutor, 
    private memberManager: MemberManager
  ) {}

  canHandle(event: BaseEvent): boolean {
    return event.type === 'member_damage';
  }

  execute(event: BaseEvent, context: ExecutionContext): EventResult {
    try {
      const payload = event.payload as any;
      console.log(`处理伤害事件: ${event.id}`, payload);
      
      // 获取目标和施法者
      const target = this.memberManager.getMember(payload.targetId);
      const source = this.memberManager.getMember(payload.sourceId);
      
      if (!target) {
        return {
          success: false,
          error: `目标不存在: ${payload.targetId}`
        };
      }

      // 构建表达式上下文
      const expressionContext: ExpressionContext = {
        currentFrame: context.currentFrame,
        caster: source,
        target: target,
        skill: payload.skillId ? { id: payload.skillId } : undefined
      };

      // 计算伤害
      const damageExpression = payload.damageExpression || "100";
      const damageResult = this.eventExecutor.executeExpression(damageExpression, expressionContext);
      
      if (!damageResult.success) {
        console.warn(`伤害计算失败: ${damageExpression}`, damageResult.error);
        return {
          success: false,
          error: damageResult.error
        };
      }

      const finalDamage = Math.max(0, Math.floor(damageResult.value));
      
      // 应用伤害到目标
      if (typeof target.takeDamage === 'function') {
        target.takeDamage(finalDamage);
      }

      console.log(`${target.getName()} 受到 ${finalDamage} 点伤害`);
      
      return {
        success: true,
        data: {
          ...payload,
          actualDamage: finalDamage,
          targetCurrentHp: target.getStats?.()?.currentHp || 0
        }
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
      const payload = event.payload as any;
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
      const payload = event.payload as any;
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
      const payload = event.payload as any;
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
      const payload = event.payload as any;
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