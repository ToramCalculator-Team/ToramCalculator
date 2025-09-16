/**
 * Buff管理器 - 简化版本，专注于生命周期管理
 * 
 * 核心职责：
 * 1. 管理buff的基本生命周期（添加、移除、更新）
 * 2. 与技能效果数据库集成
 * 3. 通知PipelineManager进行管线插入/移除
 * 4. 通知Member的StateContainer进行状态修改
 */

import type { PipelineManager, CustomPipelineStage } from "../pipeline/PipelineManager";

// 简单的ID生成实现
function generateId(): string {
  return `buff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== BuffManager 实现 ====================

export class BuffManager {
  private buffs = new Map<string, BuffInstance>();
  private skillEffectService: SkillEffectService | null = null;
  private pipelineManager: PipelineManager<any, any> | null = null;
  private changeListeners = new Set<() => void>();
  private currentFrame: number = 0;

  constructor() {}

  // ==================== 依赖注入 ====================

  /**
   * 设置技能效果服务
   */
  setSkillEffectService(service: SkillEffectService): void {
    this.skillEffectService = service;
  }

  /**
   * 设置管线管理器
   */
  setPipelineManager(manager: PipelineManager<any, any>): void {
    this.pipelineManager = manager;
  }

  // ==================== 核心生命周期管理 ====================

  /**
   * 添加buff
   */
  addBuff(
    skillEffectId: string, 
    source: string, 
    options: {
      stacks?: number;
      duration?: Duration;
      data?: Record<string, any>;
    } = {}
  ): string | null {
    if (!this.skillEffectService) {
      console.error("❌ BuffManager: SkillEffectService未设置");
      return null;
    }

    // 1. 从缓存获取技能效果（同步操作）
    const skillEffect = this.skillEffectService.getSkillEffectSync(skillEffectId);
    if (!skillEffect) {
      console.error(`❌ BuffManager: 未找到技能效果: ${skillEffectId}`);
      return null;
    }

    // 2. 检查是否已存在相同buff
    const existingBuff = this.findBuffBySkillEffect(skillEffectId, source);
    if (existingBuff && skillEffect.buffConfig?.refreshable) {
      // 刷新现有buff
      this.refreshBuff(existingBuff.id, options.duration);
      if (options.stacks) {
        existingBuff.currentStacks = Math.min(
          existingBuff.maxStacks,
          existingBuff.currentStacks + options.stacks
        );
      }
      this.notifyChange();
      return existingBuff.id;
    } else if (existingBuff) {
      console.warn(`⚠️ BuffManager: buff不可刷新: ${skillEffect.name}`);
      return null;
    }

    // 3. 创建新buff实例
    const buffId = generateId();
    const now = Date.now();
    const duration = options.duration ?? skillEffect.buffConfig?.duration ?? -1;
    
    const buffInstance: BuffInstance = {
      id: buffId,
      skillEffectId,
      name: skillEffect.name,
      source,
      remainingTime: this.convertDurationToSeconds(duration),
      duration: duration,
      startTime: now,
      startFrame: this.currentFrame,
      currentStacks: options.stacks || 1,
      maxStacks: skillEffect.buffConfig?.maxStacks || 1,
      refreshable: skillEffect.buffConfig?.refreshable ?? false,
      active: true,
      data: { ...options.data }
    };

    this.buffs.set(buffId, buffInstance);

    // 4. 通知PipelineManager插入管线
    if (this.pipelineManager && skillEffect.pipelineInsertions) {
      for (const insertion of skillEffect.pipelineInsertions) {
        if (insertion.insertTime === "skill_use") {
          // 将PipelineInsertion转换为CustomPipelineStage
          // 生命周期属性由BuffManager管理，不传递给管线阶段
          const customStage: CustomPipelineStage = {
            id: `${buffId}_${insertion.hook}`,
            source: buffId,
            logic: insertion.logic,
            priority: insertion.priority || 100,
            description: insertion.description
          };
          
          this.pipelineManager.insertStage(insertion.hook, customStage);
        }
      }
    }

    // 5. 应用状态修改器（这里需要与Member.stateContainer集成）
    if (skillEffect.stateModifiers) {
      // TODO: 通知Member应用状态修改器
      // member.stateContainer.addModifier(buffId, skillEffect.stateModifiers);
    }

    this.notifyChange();
    console.log(`✅ BuffManager: 添加buff: ${skillEffect.name} (${buffId})`);
    
    return buffId;
  }

  /**
   * 移除buff
   */
  removeBuff(buffId: string): boolean {
    const buff = this.buffs.get(buffId);
    if (!buff) {
      return false;
    }

    // 1. 通知PipelineManager移除管线
    if (this.pipelineManager) {
      this.pipelineManager.removeStagesBySource(buffId);
    }

    // 2. 移除状态修改器
    // TODO: 通知Member移除状态修改器
    // member.stateContainer.removeModifier(buffId);

    // 3. 删除buff记录
    this.buffs.delete(buffId);
    this.notifyChange();

    console.log(`🗑️ BuffManager: 移除buff: ${buff.name} (${buffId})`);
    return true;
  }

  /**
   * 刷新buff持续时间
   */
  refreshBuff(buffId: string, newDuration?: Duration): boolean {
    const buff = this.buffs.get(buffId);
    if (!buff || !buff.refreshable) {
      return false;
    }

    if (newDuration !== undefined) {
      buff.remainingTime = this.convertDurationToSeconds(newDuration);
    }
    buff.startTime = Date.now();

    this.notifyChange();
    console.log(`🔄 BuffManager: 刷新buff: ${buff.name} (${buffId})`);
    return true;
  }


  // ==================== 查询方法 ====================

  /**
   * 获取所有激活的buff
   */
  getActiveBuffs(): BuffInstance[] {
    return Array.from(this.buffs.values()).filter(buff => buff.active);
  }

  /**
   * 获取buff详情
   */
  getBuff(buffId: string): BuffInstance | undefined {
    return this.buffs.get(buffId);
  }

  /**
   * 根据技能效果查找buff
   */
  findBuffBySkillEffect(skillEffectId: string, source?: string): BuffInstance | undefined {
    for (const buff of this.buffs.values()) {
      if (buff.skillEffectId === skillEffectId && (!source || buff.source === source)) {
        return buff;
      }
    }
    return undefined;
  }

  /**
   * 更新buff状态（由Member调用）
   */
  updateBuffs(currentFrame: number): void {
    this.currentFrame = currentFrame;
    
    // 检查并移除过期的buff
    const expiredBuffs: string[] = [];
    
    for (const [buffId, buff] of this.buffs) {
      if (this.isBuffExpired(buff, currentFrame)) {
        expiredBuffs.push(buffId);
      }
    }
    
    // 移除过期的buff
    for (const buffId of expiredBuffs) {
      this.removeBuff(buffId);
    }
    
    if (expiredBuffs.length > 0) {
      console.log(`⏰ BuffManager: 移除 ${expiredBuffs.length} 个过期buff`);
    }
  }

  /**
   * 清除所有buff
   */
  clearAllBuffs(): void {
    const buffIds = Array.from(this.buffs.keys());
    for (const buffId of buffIds) {
      this.removeBuff(buffId);
    }
    console.log(`🧹 BuffManager: 清除所有buff, 移除数量: ${buffIds.length}`);
  }

  // ==================== 内部方法 ====================

  /**
   * 检查buff是否过期
   */
  private isBuffExpired(buff: BuffInstance, currentFrame: number): boolean {
    if (buff.duration === -1) return false; // 永久buff
    if (buff.duration === 0) return true;   // 一次性buff，应该立即过期
    
    const elapsedFrames = currentFrame - buff.startFrame;
    const durationFrames = buff.duration * 60; // 假设60FPS
    return elapsedFrames >= durationFrames;
  }

  /**
   * 转换持续时间到秒数
   */
  private convertDurationToSeconds(duration: Duration): number {
    if (duration === -1) return -1; // 永久
    if (duration === 0) return 0;   // 一次性
    return duration; // 秒数
  }

  /**
   * 通知状态变化
   */
  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (error) {
        console.error("BuffManager: 通知监听器失败:", error);
      }
    }
  }

  /**
   * 监听buff状态变化
   */
  onBuffChange(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  // ==================== 调试和统计 ====================

  /**
   * 获取统计信息
   */
  getStats() {
    const activeBuffs = this.getActiveBuffs();
    const buffsByEffect = new Map<string, number>();

    for (const buff of activeBuffs) {
      buffsByEffect.set(buff.skillEffectId, (buffsByEffect.get(buff.skillEffectId) || 0) + 1);
    }

    return {
      totalBuffs: activeBuffs.length,
      buffsByEffect: Object.fromEntries(buffsByEffect)
    };
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.clearAllBuffs();
    this.changeListeners.clear();
  }
}

// ==================== 单例导出 ====================

/** 全局buff管理器实例 */
export const buffManager = new BuffManager();