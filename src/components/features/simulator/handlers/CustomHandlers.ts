/**
 * 自定义事件处理器 - 处理custom类型的事件
 *
 * 核心职责：
 * 1. 处理属性修改请求
 * 2. 执行JavaScript片段
 * 3. 处理自定义游戏逻辑
 *
 * 设计理念：
 * - 安全执行：所有JS片段在沙盒环境中执行
 * - 灵活扩展：支持多种自定义操作类型
 * - 错误处理：提供详细的错误信息和回滚机制
 */

import type { BaseEvent, EventHandler, ExecutionContext, EventResult } from "../core/EventQueue";
import type GameEngine from "../core/GameEngine";
import type MemberManager from "../core/MemberManager";
import { ModifierType } from "../core/dataSys/StatContainer";

// ============================== 自定义事件处理器 ==============================

/**
 * 自定义事件处理器
 */
export class CustomEventHandler implements EventHandler {
  constructor(
    private gameEngine: GameEngine,
    private memberManager: MemberManager,
  ) {}

  canHandle(event: BaseEvent): boolean {
    return event.type === "custom" || event.type === "member_fsm_event";
  }

  execute(event: BaseEvent, context: ExecutionContext): EventResult {
    try {
      const payload = event.payload as any;
      if (event.type === "member_fsm_event") {
        // 将排程到达的 FSM 事件转发给目标成员的状态机
        const targetMemberId = payload?.targetMemberId;
        const member = this.memberManager.getMember(targetMemberId);
        if (!member) {
          return { success: false, error: `目标成员不存在: ${targetMemberId}` };
        }
        try {
          member.actor.send({ type: payload.fsmEventType });
          return { success: true, data: { forwarded: true, to: targetMemberId, eventType: payload.fsmEventType } };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : "FSM send failed" };
        }
      }

      console.log(`🎮 处理自定义事件: ${event.id}`, payload);

      // 获取目标成员
      const targetMemberId = payload.targetMemberId as string;
      const actor = this.memberManager.getMember(targetMemberId);
      if (!actor) {
        return {
          success: false,
          error: `目标成员不存在: ${targetMemberId}`,
        };
      }

      // 处理自定义操作 - 优先执行JS片段，属性修改作为副作用
      if (payload.scriptCode) {
        // 主要场景：执行JS片段（可能包含属性修改）
        return this.handleScriptExecution(targetMemberId, payload, context);
      } else if (payload.action === "modify_attribute") {
        // 兼容场景：直接属性修改（不常见）
        return this.handleAttributeModification(targetMemberId, payload, context);
      } else {
        return {
          success: false,
          error: `无效的自定义操作: 缺少scriptCode或action参数`,
        };
      }
    } catch (error) {
      console.error(`❌ 自定义事件处理失败: ${event.id}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 处理属性修改
   */
  private handleAttributeModification(targetMemberId: string, payload: any, _context: ExecutionContext): EventResult {
    try {
      const { attribute, value, op } = payload as { attribute: string; value: number; op?: "set" | "add" };
      const entry = this.memberManager.getMember(targetMemberId);
      if (!entry) {
        return { success: false, error: `目标成员不存在: ${targetMemberId}` };
      }

      const sourceId = payload?.sourceId || `custom_event_handler_${attribute}`;
      const current = entry.statContainer.getValue(attribute);

      if (op === "add") {
        entry.statContainer.addModifier(attribute, ModifierType.STATIC_FIXED, Number(value) || 0, {
          id: sourceId,
          name: "custom_event_handler",
          type: "system",
        });
      } else {
        // 绝对赋值：移除旧值（同源），按差值补一个静态修饰以达成目标
        const delta = (Number(value) || 0) - (Number(current) || 0);
        entry.statContainer.removeModifier(attribute, ModifierType.STATIC_FIXED, sourceId);
        entry.statContainer.addModifier(attribute, ModifierType.STATIC_FIXED, delta, {
          id: sourceId,
          name: "custom_event_handler",
          type: "system",
        });
      }

      const nextValue = entry.statContainer.getValue(attribute);
      console.log(`✅ 属性修改成功: ${attribute}: ${current} -> ${nextValue}`);
      return { success: true, data: { attribute, value: nextValue, op: op || "set" } };
    } catch (error) {
      return { success: false, error: `属性修改失败: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  /**
   * 处理脚本执行
   */
  private handleScriptExecution(targetMemberId: string, payload: any, context: ExecutionContext): EventResult {
    try {
      const { scriptCode } = payload as { scriptCode: string };
      console.log(`📜 执行成员 ${targetMemberId} 的脚本`);

      // 使用 GameEngine 的编译和执行流程
      const compiledCode = this.gameEngine.compileScript(scriptCode, targetMemberId);
      
      // 通过 GameEngine 执行编译后的代码
      const result = this.gameEngine.executeScript(compiledCode, {
        currentFrame: context.currentFrame,
        casterId: targetMemberId,
        targetId: undefined,
        skillLv: 0,
        environment: context
      });

      console.log(`✅ 脚本执行成功:`, result);
      return { success: true, data: { scriptResult: result } };
    } catch (error) {
      return { 
        success: false, 
        error: `脚本执行失败: ${error instanceof Error ? error.message : "Unknown error"}` 
      };
    }
  }

  /**
   * 处理组合操作（属性修改 + 脚本执行）
   */
  private handleCombinedOperation(targetMemberId: string, payload: any, context: ExecutionContext): EventResult {
    try {
      const results: any[] = [];

      // 先执行属性修改
      if (payload.attributeChanges) {
        for (const change of payload.attributeChanges) {
          const attrResult = this.handleAttributeModification(targetMemberId, change, context);
          results.push({ type: "attribute", result: attrResult });

          if (!attrResult.success) {
            throw new Error(`属性修改失败: ${attrResult.error}`);
          }
        }
      }

      // 再执行脚本
      if (payload.scriptCode) {
        const scriptResult = this.handleScriptExecution(targetMemberId, payload, context);
        results.push({ type: "script", result: scriptResult });

        if (!scriptResult.success) {
          throw new Error(`脚本执行失败: ${scriptResult.error}`);
        }
      }

      return {
        success: true,
        data: {
          operations: results,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `组合操作失败: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}
