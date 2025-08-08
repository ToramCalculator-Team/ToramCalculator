/**
 * 事件处理器工厂 - 创建和管理事件处理器
 * 
 * 核心职责：
 * 1. 创建所有事件处理器实例
 * 2. 注入必要的依赖
 * 3. 提供处理器注册接口
 * 
 * 设计理念：
 * - 工厂模式：集中创建和管理处理器
 * - 依赖注入：注入处理器所需的服务
 * - 扩展性：易于添加新的处理器类型
 */


import type { EventHandler } from "../core/EventQueue";
import type { EventExecutor } from "../core/EventExecutor";
import type { MemberManager } from "../core/MemberManager";
import type GameEngine from "../core/GameEngine";

// 导入所有处理器
import {
  MemberDamageHandler,
  MemberHealHandler,
  MemberDeathHandler,
  BuffApplyHandler,
  BuffRemoveHandler
} from "./CombatHandlers";

import {
  SkillStartHandler,
  SkillPrepareHandler,
  SkillChargeHandler,
  SkillEffectHandler,
  SkillEndHandler,
  SkillCastHandler
} from "./SkillHandlers";

import {
  CustomEventHandler
} from "./CustomHandlers";

// ============================== 事件处理器工厂 ==============================

/**
 * 事件处理器工厂类
 */
export class EventHandlerFactory {
  // ==================== 私有属性 ====================

  /** 游戏引擎引用 */
  private engine: GameEngine;

  /** 创建的处理器缓存 */
  private handlerCache: Map<string, EventHandler> = new Map();

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   * 
   * @param engine 游戏引擎实例
   */
  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  // ==================== 公共接口 ====================

  /**
   * 创建所有默认事件处理器
   * 
   * @returns 事件处理器映射表
   */
  createDefaultHandlers(): Map<string, EventHandler> {
    const handlers = new Map<string, EventHandler>();

    // 创建战斗事件处理器
    handlers.set('member_damage', this.createMemberDamageHandler());
    handlers.set('member_heal', this.createMemberHealHandler());
    handlers.set('member_death', this.createMemberDeathHandler());
    handlers.set('buff_apply', this.createBuffApplyHandler());
    handlers.set('buff_remove', this.createBuffRemoveHandler());

    // 创建技能事件处理器
    handlers.set('skill_start', this.createSkillStartHandler());
    handlers.set('skill_prepare_start', this.createSkillPrepareHandler());
    handlers.set('skill_charge_start', this.createSkillChargeHandler());
    handlers.set('skill_effect', this.createSkillEffectHandler());
    handlers.set('skill_end', this.createSkillEndHandler());
    handlers.set('skill_cast', this.createSkillCastHandler());

    // 创建自定义事件处理器
    const customHandler = this.createCustomEventHandler();
    handlers.set('custom', customHandler);
    // 复用同一处理器处理按帧调度的 FSM 转发事件
    handlers.set('member_fsm_event', customHandler);

    // console.log(`EventHandlerFactory: 创建了 ${handlers.size} 个事件处理器`);
    return handlers;
  }

  /**
   * 创建指定类型的事件处理器
   * 
   * @param handlerType 处理器类型
   * @returns 事件处理器实例
   */
  createHandler(handlerType: string): EventHandler | null {
    // 检查缓存
    if (this.handlerCache.has(handlerType)) {
      return this.handlerCache.get(handlerType)!;
    }

    let handler: EventHandler | null = null;

    switch (handlerType) {
      // 战斗事件处理器
      case 'member_damage':
        handler = this.createMemberDamageHandler();
        break;
      case 'member_heal':
        handler = this.createMemberHealHandler();
        break;
      case 'member_death':
        handler = this.createMemberDeathHandler();
        break;
      case 'buff_apply':
        handler = this.createBuffApplyHandler();
        break;
      case 'buff_remove':
        handler = this.createBuffRemoveHandler();
        break;

      // 技能事件处理器
      case 'skill_start':
        handler = this.createSkillStartHandler();
        break;
      case 'skill_prepare_start':
        handler = this.createSkillPrepareHandler();
        break;
      case 'skill_charge_start':
        handler = this.createSkillChargeHandler();
        break;
      case 'skill_effect':
        handler = this.createSkillEffectHandler();
        break;
      case 'skill_end':
        handler = this.createSkillEndHandler();
        break;
      case 'skill_cast':
        handler = this.createSkillCastHandler();
        break;

      default:
        console.warn(`EventHandlerFactory: 未知的处理器类型: ${handlerType}`);
        return null;
    }

    // 缓存处理器
    if (handler) {
      this.handlerCache.set(handlerType, handler);
    }

    return handler;
  }

  /**
   * 清理处理器缓存
   */
  clearCache(): void {
    this.handlerCache.clear();
    console.log("EventHandlerFactory: 清理处理器缓存");
  }

  // ==================== 私有方法 ====================

  /**
   * 创建成员伤害处理器
   */
  private createMemberDamageHandler(): EventHandler {
    return new MemberDamageHandler(this.engine.getFrameLoop().getEventExecutor(), this.engine.getMemberManager());
  }

  /**
   * 创建成员治疗处理器
   */
  private createMemberHealHandler(): EventHandler {
    return new MemberHealHandler();
  }

  /**
   * 创建成员死亡处理器
   */
  private createMemberDeathHandler(): EventHandler {
    return new MemberDeathHandler();
  }

  /**
   * 创建Buff应用处理器
   */
  private createBuffApplyHandler(): EventHandler {
    return new BuffApplyHandler();
  }

  /**
   * 创建Buff移除处理器
   */
  private createBuffRemoveHandler(): EventHandler {
    return new BuffRemoveHandler();
  }

  /**
   * 创建技能开始处理器
   */
  private createSkillStartHandler(): EventHandler {
    return new SkillStartHandler();
  }

  /**
   * 创建技能前摇处理器
   */
  private createSkillPrepareHandler(): EventHandler {
    return new SkillPrepareHandler();
  }

  /**
   * 创建技能蓄力处理器
   */
  private createSkillChargeHandler(): EventHandler {
    return new SkillChargeHandler();
  }

  /**
   * 创建技能效果处理器
   */
  private createSkillEffectHandler(): EventHandler {
    return new SkillEffectHandler();
  }

  /**
   * 创建技能结束处理器
   */
  private createSkillEndHandler(): EventHandler {
    return new SkillEndHandler();
  }

  /**
   * 创建技能释放处理器
   */
  private createSkillCastHandler(): EventHandler {
    return new SkillCastHandler();
  }

  /**
   * 创建自定义事件处理器
   */
  private createCustomEventHandler(): EventHandler {
    return new CustomEventHandler(this.engine.getFrameLoop().getEventExecutor(), this.engine.getMemberManager());
  }
}

// ============================== 导出 ==============================

export default EventHandlerFactory;