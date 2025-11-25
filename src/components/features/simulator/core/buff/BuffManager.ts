/**
 * Buff管理器 - 简化版本，专注于生命周期管理
 *
 * 核心职责：
 * 1. 管理buff的基本生命周期（添加、移除、更新）
 * 2. 通知PipelineManager进行管线插入/移除
 * 3. 通知Member的StateContainer进行状态修改
 */

import { ModifierSource, ModifierType, StatContainer } from "../dataSys/StatContainer";
import { PipelineManager } from "../pipeline/PipelineManager";

// ==================== 类型定义 ====================

/**
 * 属性修改效果
 */
export interface StatBuffEffect {
  type: "stat";
  /** 目标属性路径 (如 "atk.p") */
  target: string;
  /** 修改类型 (Base, Add, Mul, Final) */
  modifierType: ModifierType;
  /** 修改值 */
  value: number;
}

/**
 * 管线修改效果
 */
export interface PipelineBuffEffect {
  type: "pipeline";
  /** 目标管线名称 */
  pipeline: string;
  /** 插入点阶段名称 (在此阶段后执行) */
  stage: string;
  /** 动态逻辑函数 */
  logic: (context: any, input: any) => any;
  /** 优先级 */
  priority?: number;
}

export type BuffEffect = StatBuffEffect | PipelineBuffEffect;

/**
 * Buff 实例
 */
export interface BuffInstance {
  id: string;
  name: string;
  effects: BuffEffect[];
  /** 持续时间 (秒)，-1 表示永久 */
  duration: number;
  /** 开始时间 (Timestamp) */
  startTime: number;
  /** 来源标识 */
  source?: string;
  description?: string;

  // 叠加与刷新规则
  /** 最大层数，默认1 */
  maxStacks?: number;
  /** 当前层数，默认1 */
  currentStacks?: number;
  /** 是否可刷新持续时间，默认true */
  refreshable?: boolean;

  // 运行时状态记录（用于移除时回滚）
  /** 记录已应用的属性修改，用于移除时反向操作 */
  _appliedStats?: { target: string; modifierType: ModifierType }[];
}

// ==================== BuffManager 实现 ====================

export class BuffManager {
  private buffs = new Map<string, BuffInstance>();

  constructor(
    private statContainer: StatContainer<any>,
    private pipelineManager: PipelineManager<any, any, any>,
  ) {}

  /**
   * 添加 Buff
   */
  addBuff(buff: BuffInstance): void {
    const existingBuff = this.buffs.get(buff.id);

    if (existingBuff) {
      // 这里的逻辑：如果 ID 相同，视为同一种 Buff 的再次施加
      // 处理刷新和叠加
      const isRefreshable = existingBuff.refreshable ?? true;
      const maxStacks = existingBuff.maxStacks ?? 1;
      let newStacks = (existingBuff.currentStacks ?? 1);

      if (newStacks < maxStacks) {
        newStacks++;
      }

      if (isRefreshable) {
        existingBuff.startTime = Date.now();
        existingBuff.duration = buff.duration; // 更新为新的持续时间
      }

      const oldStacks = existingBuff.currentStacks ?? 1;
      existingBuff.currentStacks = newStacks;
      
      // 如果层数增加，应用新增的 stat 效果（叠加数值）
      if (newStacks > oldStacks) {
         this.applyBuffEffects(existingBuff, true); // true 表示叠加增量
      }
      
      // 更新记录
      this.buffs.set(existingBuff.id, existingBuff);
      console.log(`🔄 Buff Refreshed: ${existingBuff.name} (${existingBuff.id}), Stacks: ${newStacks}`);
      return;
    }

    // 新 Buff
    buff.currentStacks = 1;
    buff._appliedStats = [];
    this.buffs.set(buff.id, buff);
    this.applyBuffEffects(buff, false);

    console.log(`✅ Buff Added: ${buff.name} (${buff.id})`);
  }

  /**
   * 应用 Buff 效果
   * @param buff Buff实例
   * @param isStacking 是否是叠加层数（如果是，只应用 Stat 增量）
   */
  private applyBuffEffects(buff: BuffInstance, isStacking: boolean): void {
    // 构造符合 StatContainer 要求的 ModifierSource
    const source: ModifierSource = {
      id: buff.id,
      name: buff.name,
      type: "buff",
      // description 属性在 StatContainer 的 ModifierSource 中不存在，故移除
    };

    buff.effects.forEach((effect) => {
      if (effect.type === "stat") {
        // StatContainer 的 addModifier 是累加的
        this.statContainer.addModifier(
          effect.target,
          effect.modifierType,
          effect.value,
          source,
        );
        
        // 记录应用的属性，以便移除时调用 removeModifier
        // 注意：如果是叠加层数，可能已经记录过了。我们需要去重吗？
        // removeModifier(attr, type, sourceId) 会移除该 source 在该属性下的所有值。
        // 所以只需要记录一次即可。
        if (!buff._appliedStats) buff._appliedStats = [];
        const alreadyRecorded = buff._appliedStats.some(
          (s) => s.target === effect.target && s.modifierType === effect.modifierType
        );
        
        if (!alreadyRecorded) {
          buff._appliedStats.push({
            target: effect.target,
            modifierType: effect.modifierType,
          });
        }

      } else if (effect.type === "pipeline") {
        // 管线效果：仅在非叠加（首次）时添加
        if (!isStacking) {
          const stageId = `${buff.id}_${effect.pipeline}_${effect.stage}`;
          // 使用 any 绕过泛型检查
          (this.pipelineManager as any).insertDynamicStage(
            effect.pipeline,
            effect.stage,
            effect.logic,
            stageId,
            buff.id // source = buff.id
          );
        }
      }
    });
  }

  /**
   * 移除 Buff
   */
  removeBuff(buffId: string): void {
    const buff = this.buffs.get(buffId);
    if (!buff) return;

    // 1. 移除属性修改
    if (buff._appliedStats) {
      buff._appliedStats.forEach((record) => {
        // 使用 removeModifier 移除
        this.statContainer.removeModifier(
          record.target,
          record.modifierType,
          buff.id // sourceId
        );
      });
      buff._appliedStats = [];
    }

    // 2. 移除管线效果 (使用 Source 批量移除)
    (this.pipelineManager as any).removeStagesBySource(buff.id);

    this.buffs.delete(buffId);
    console.log(`🗑️ Buff Removed: ${buff.name} (${buffId})`);
  }

  /**
   * 获取所有 Buff
   */
  getBuffs(): BuffInstance[] {
    return Array.from(this.buffs.values());
  }

  /**
   * Tick 更新 (用于检查过期)
   * @param currentTime 当前时间戳 (ms)
   */
  tick(currentTime: number): void {
    const expiredBuffs: string[] = [];

    for (const [id, buff] of this.buffs) {
      if (buff.duration !== -1) {
        // 使用 startTime 计算结束时间
        const endTime = buff.startTime + buff.duration * 1000;
        if (currentTime >= endTime) {
          expiredBuffs.push(id);
        }
      }
    }

    expiredBuffs.forEach((id) => this.removeBuff(id));
  }

  /**
   * 清除所有 Buff
   */
  clear(): void {
    // 创建副本以避免在迭代时修改 Map
    const ids = Array.from(this.buffs.keys());
    for (const id of ids) {
      this.removeBuff(id);
    }
  }
}
