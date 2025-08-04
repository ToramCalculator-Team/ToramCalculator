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
import type { EventExecutor, ExpressionContext } from "../core/EventExecutor";
import type { MemberManager } from "../core/MemberManager";
import Member, { TargetType } from "../core/Member";

// ============================== 自定义事件处理器 ==============================

/**
 * 自定义事件处理器
 */
export class CustomEventHandler implements EventHandler {
  constructor(
    private eventExecutor: EventExecutor, 
    private memberManager: MemberManager
  ) {}

  canHandle(event: BaseEvent): boolean {
    return event.type === 'custom';
  }

  execute(event: BaseEvent, context: ExecutionContext): EventResult {
    try {
      const payload = event.payload as any;
      console.log(`🎮 处理自定义事件: ${event.id}`, payload);
      
      // 获取目标成员
      const targetMemberId = (payload as any).targetMemberId;
      const targetMember = this.memberManager.getMember(targetMemberId);
      if (!targetMember) {
        return {
          success: false,
          error: `目标成员不存在: ${targetMemberId}`
        };
      }

      // 处理自定义操作 - 优先执行JS片段，属性修改作为副作用
      if (payload.scriptCode) {
        // 主要场景：执行JS片段（可能包含属性修改）
        return this.handleScriptExecution(targetMember, payload, context);
      } else if (payload.action === 'modify_attribute') {
        // 兼容场景：直接属性修改（不常见）
        return this.handleAttributeModification(targetMember, payload, context);
      } else {
        return {
          success: false,
          error: `无效的自定义操作: 缺少scriptCode或action参数`
        };
      }

    } catch (error) {
      console.error(`❌ 自定义事件处理失败: ${event.id}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 处理属性修改
   */
  private handleAttributeModification(member: Member, payload: any, context: ExecutionContext): EventResult {
    try {
      const { attribute, value } = payload;
      
      console.log(`🔧 修改成员 ${member.getName()} 的属性: ${attribute} = ${value}`);
      
      // 使用Member提供的protected方法（通过类型断言访问）
      const success = (member as any).setAttributeDirect(attribute, value, "custom_event_handler");
      
      if (success) {
        console.log(`✅ 属性修改成功: ${attribute} = ${value}`);
        return {
          success: true,
          data: {
            attribute,
            value,
            source: "custom_event_handler"
          }
        };
      } else {
        throw new Error(`属性修改失败: setAttributeDirect returned false`);
      }
    } catch (error) {
      return {
        success: false,
        error: `属性修改失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 处理脚本执行
   */
  private handleScriptExecution(member: Member, payload: any, context: ExecutionContext): EventResult {
    try {
      const { scriptCode } = payload;
      
      console.log(`📜 执行成员 ${member.getName()} 的脚本`);
      
      // 准备脚本执行上下文
      const scriptContext: ExpressionContext = {
        member,
        caster: member,
        reactiveSystem: (member as any).reactiveDataManager,
        currentFrame: context.currentFrame
      };
      
      // 执行脚本
      const result = this.eventExecutor.executeScript(scriptCode, scriptContext);
      
      console.log(`✅ 脚本执行成功:`, result);
      
      return {
        success: true,
        data: {
          scriptResult: result
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `脚本执行失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 处理组合操作（属性修改 + 脚本执行）
   */
  private handleCombinedOperation(member: Member, payload: any, context: ExecutionContext): EventResult {
    try {
      const results: any[] = [];
      
      // 先执行属性修改
      if (payload.attributeChanges) {
        for (const change of payload.attributeChanges) {
          const attrResult = this.handleAttributeModification(member, change, context);
          results.push({ type: 'attribute', result: attrResult });
          
          if (!attrResult.success) {
            throw new Error(`属性修改失败: ${attrResult.error}`);
          }
        }
      }
      
      // 再执行脚本
      if (payload.scriptCode) {
        const scriptResult = this.handleScriptExecution(member, payload, context);
        results.push({ type: 'script', result: scriptResult });
        
        if (!scriptResult.success) {
          throw new Error(`脚本执行失败: ${scriptResult.error}`);
        }
      }
      
      return {
        success: true,
        data: {
          operations: results
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `组合操作失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}