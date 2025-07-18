/**
 * 模拟器示例 - 展示核心模块如何协作
 * 
 * 这个文件展示了：
 * 1. 如何初始化完整的模拟器系统
 * 2. 如何处理用户输入和FSM事件
 * 3. 如何运行帧循环和事件处理
 * 4. 如何添加自定义事件处理器
 * 
 * 注意：这是一个示例文件，用于演示架构设计
 */

import { GameEngine } from "./GameEngine";
import { createSkillFSMEvent, createFSMEvent } from "./FSMEventBridge";
import type { BaseEvent, EventHandler, ExecutionContext, EventResult } from "./EventQueue";
import { createId } from '@paralleldrive/cuid2';
import { Logger } from "~/utils/logger";

// ============================== 示例事件处理器 ==============================

/**
 * 示例技能伤害处理器
 */
class ExampleSkillDamageHandler implements EventHandler {
  canHandle(event: BaseEvent): boolean {
    return event.type === 'skill_damage';
  }

  async execute(event: BaseEvent, context: ExecutionContext): Promise<EventResult> {
    const { memberId, targetId, damage, skillName } = event.payload as any;
    
    console.log(`⚔️ ${skillName} 造成伤害: ${damage} (${memberId} -> ${targetId})`);
    
    // 模拟伤害处理
    // 这里会实际修改目标的HP
    
    // 可能产生的连锁事件
    const newEvents: BaseEvent[] = [];
    
    // 如果伤害足够高，可能触发死亡事件
    if (damage > 500) {
      newEvents.push({
        id: createId(),
        executeFrame: context.currentFrame + 1,
        priority: 'high',
        type: 'member_death',
        payload: {
          memberId: targetId,
          cause: 'skill_damage',
          sourceSkill: skillName
        },
        source: `member_${memberId}`,
        actionId: event.actionId
      });
    }
    
    return {
      success: true,
      data: {
        actualDamage: damage,
        targetId,
        remainingHP: 1000 - damage // 示例数据
      },
      newEvents
    };
  }
}

/**
 * 示例Buff处理器
 */
class ExampleBuffTickHandler implements EventHandler {
  canHandle(event: BaseEvent): boolean {
    return event.type === 'buff_tick';
  }

  async execute(event: BaseEvent, context: ExecutionContext): Promise<EventResult> {
    const { memberId, buffType, tickDamage, remainingTicks } = event.payload as any;
    
    console.log(`🔥 ${buffType} 持续效果: ${tickDamage} 伤害 (剩余 ${remainingTicks} 次)`);
    
    const newEvents: BaseEvent[] = [];
    
    // 如果还有剩余次数，安排下一次tick
    if (remainingTicks > 1) {
      newEvents.push({
        id: createId(),
        executeFrame: context.currentFrame + 60, // 1秒后
        priority: 'normal',
        type: 'buff_tick',
        payload: {
          memberId,
          buffType,
          tickDamage,
          remainingTicks: remainingTicks - 1
        },
        source: `buff_${buffType}_${memberId}`,
        actionId: event.actionId
      });
    }
    
    return {
      success: true,
      data: {
        tickDamage,
        remainingTicks: remainingTicks - 1
      },
      newEvents
    };
  }
}

// ============================== 模拟器示例类 ==============================

/**
 * 模拟器示例类
 * 展示完整的系统集成
 */
export class SimulatorExample {
  private gameEngine: GameEngine;
  private isRunning = false;

  constructor() {
    console.log("🚀 初始化模拟器示例");
    
    // 1. 创建GameEngine（这会自动创建其他核心模块）
    this.gameEngine = new GameEngine({
      targetFPS: 60,
      maxSimulationTime: 120,
      enableRealtimeControl: true
    });

    // 2. 注册自定义事件处理器
    this.registerCustomEventHandlers();

    // 3. 设置FSM事件桥接的自定义规则
    this.setupCustomTransformRules();

    console.log("✅ 模拟器示例初始化完成");
  }

  /**
   * 启动模拟器
   */
  start(): void {
    if (this.isRunning) {
      console.warn("模拟器已在运行");
      return;
    }

    console.log("🎮 启动模拟器");
    this.isRunning = true;

    // 启动游戏引擎
    this.gameEngine.start();

    // 添加一些示例成员和初始事件
    this.setupExampleScenario();
  }

  /**
   * 停止模拟器
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn("模拟器未运行");
      return;
    }

    console.log("⏹️ 停止模拟器");
    this.isRunning = false;

    // 停止游戏引擎
    this.gameEngine.stop();
  }

  /**
   * 暂停模拟器
   */
  pause(): void {
    this.gameEngine.pause();
  }

  /**
   * 恢复模拟器
   */
  resume(): void {
    this.gameEngine.resume();
  }

  /**
   * 设置时间倍率
   */
  setTimeScale(scale: number): void {
    // 通过GameEngine访问 FrameLoop
    const frameLoop = (this.gameEngine as any).frameLoop;
    if (frameLoop) {
      frameLoop.setTimeScale(scale);
    }
  }

  /**
   * 模拟用户输入 - 释放技能
   */
  simulateSkillCast(memberId: string, skillId: string, targetId: string): void {
    console.log(`👆 用户输入: ${memberId} 释放技能 ${skillId} 目标 ${targetId}`);

    // 1. 创建FSM事件（模拟状态机生成的事件）
    const fsmEvent = createSkillFSMEvent(
      'skill_cast_start',
      memberId,
      'idle',
      {
        skillId,
        targetId,
        castTime: 30, // 30帧前摇
        damage: 300
      },
      0, // 立即执行
      `skill_action_${createId()}`
    );

    // 2. 通过GameEngine的FSM桥接器转换并插入事件
    this.gameEngine.processFSMEvent(fsmEvent);

    // 3. 模拟技能的多个阶段
    this.simulateSkillPhases(memberId, skillId, targetId, fsmEvent.actionId!);
  }

  /**
   * 模拟应用Buff
   */
  simulateBuffApplication(memberId: string, buffType: string, duration: number): void {
    console.log(`🔮 应用Buff: ${buffType} 持续 ${duration} 秒`);

    const fsmEvent = createFSMEvent(
      'buff_apply',
      memberId,
      'combat',
      {
      }
    );

    this.gameEngine.processFSMEvent(fsmEvent);
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): any {
    const frameLoop = (this.gameEngine as any).frameLoop;
    const eventQueue = (this.gameEngine as any).eventQueue;
    const fsmBridge = this.gameEngine.getFSMEventBridge();
    
    return {
      isRunning: this.isRunning,
      frameNumber: frameLoop?.getFrameNumber() || 0,
      frameLoopState: frameLoop?.getState() || 'stopped',
      engineStats: this.gameEngine.getStats(),
      eventQueueStats: eventQueue?.getStats() || {},
      fsmBridgeStats: fsmBridge?.getStats() || {}
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 注册自定义事件处理器
   */
  private registerCustomEventHandlers(): void {
    this.gameEngine.registerEventHandler('skill_damage', new ExampleSkillDamageHandler());
    this.gameEngine.registerEventHandler('buff_tick', new ExampleBuffTickHandler());

    console.log("注册自定义事件处理器完成");
  }

  /**
   * 设置自定义转换规则
   */
  private setupCustomTransformRules(): void {
    const fsmBridge = this.gameEngine.getFSMEventBridge();
    
    // 技能前摇规则
    fsmBridge.registerTransformRule({
      name: 'skill_cast_phases',
      priority: 15,
      matches: (fsmEvent) => fsmEvent.type === 'skill_cast_start',
      transform: (fsmEvent, currentFrame) => {
        const data = fsmEvent.data || {};
        const { skillId, targetId, castTime, damage } = data as any;
        
        // 生成多个阶段的事件
        return [
          // 立即开始前摇
          {
            id: createId(),
            executeFrame: currentFrame,
            priority: 'high' as const,
            type: 'skill_cast_begin',
            payload: {
              memberId: fsmEvent.memberId,
              skillId,
              castTime
            },
            source: fsmEvent.source,
            actionId: fsmEvent.actionId
          },
          // 前摇结束，造成伤害
          {
            id: createId(),
            executeFrame: currentFrame + castTime,
            priority: 'high' as const,
            type: 'skill_damage',
            payload: {
              memberId: fsmEvent.memberId,
              targetId,
              damage,
              skillName: skillId
            },
            source: fsmEvent.source,
            actionId: fsmEvent.actionId
          },
          // 技能结束
          {
            id: createId(),
            executeFrame: currentFrame + castTime + 10,
            priority: 'normal' as const,
            type: 'skill_cast_end',
            payload: {
              memberId: fsmEvent.memberId,
              skillId
            },
            source: fsmEvent.source,
            actionId: fsmEvent.actionId
          }
        ];
      }
    });

    // Buff应用规则
    fsmBridge.registerTransformRule({
      name: 'buff_application',
      priority: 10,
      matches: (fsmEvent) => fsmEvent.type === 'buff_apply',
      transform: (fsmEvent, currentFrame) => {
        const data = fsmEvent.data || {};
        const { buffType, duration, tickInterval, tickDamage } = data as any;
        const totalTicks = Math.floor(duration * 60 / tickInterval); // 转换为tick次数
        
        return {
          id: createId(),
          executeFrame: currentFrame + tickInterval,
          priority: 'normal' as const,
          type: 'buff_tick',
          payload: {
            memberId: fsmEvent.memberId,
            buffType,
            tickDamage,
            remainingTicks: totalTicks
          },
          source: `buff_${buffType}_${fsmEvent.memberId}`,
          actionId: fsmEvent.actionId
        };
      }
    });

    console.log("自定义转换规则设置完成");
  }

  /**
   * 设置示例场景
   */
  private setupExampleScenario(): void {
    // 延迟几帧后开始示例
    setTimeout(() => {
      if (this.isRunning) {
        console.log("🎬 开始示例场景");
        
        // 场景1：玩家释放技能
        this.simulateSkillCast('player_1', 'fireball', 'monster_1');
        
        // 场景2：应用DOT效果
        setTimeout(() => {
          this.simulateBuffApplication('monster_1', 'burn', 5);
        }, 1000);
        
        // 场景3：多个技能连击
        setTimeout(() => {
          this.simulateSkillCast('player_1', 'ice_spike', 'monster_1');
          this.simulateSkillCast('player_1', 'lightning', 'monster_1');
        }, 2000);
      }
    }, 100);
  }

  /**
   * 模拟技能的多个阶段
   */
  private simulateSkillPhases(memberId: string, skillId: string, targetId: string, actionId: string): void {
    // 这个方法展示了如何生成技能的完整生命周期事件
    // 实际实现中，这些事件会由FSM的Action自动生成
    
    console.log(`模拟技能阶段: ${skillId} (${memberId} -> ${targetId})`);
    
    // 在实际实现中，这些事件会通过FSM事件桥接器自动生成
    // 这里只是为了演示完整的事件流
  }
}

// ============================== 导出 ==============================

export default SimulatorExample;