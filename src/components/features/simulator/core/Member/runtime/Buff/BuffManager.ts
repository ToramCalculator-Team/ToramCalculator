/**
 * Buff管理器 - 简化版本，专注于生命周期管理
 *
 * 核心职责：
 * 1. 管理buff的基本生命周期（添加、移除、更新）
 * 2. 通知PipelineManager进行管线插入/移除
 * 3. 通知Member的StateContainer进行状态修改
 */

import { ModifierSource, ModifierType, StatContainer } from "../StatContainer/StatContainer";
import { PipelineManager } from "../Action/ActionManager";
import type GameEngine from "../../../GameEngine";

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
  /** 动态逻辑：字符串（表达式）或函数 */
  logic: string | ((context: any, input: any) => any);
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
  /** 动态管线阶段对应的清理函数 */
  _pipelineStageCleanups?: Array<() => void>;
  
  /**
   * 临时变量存储（用于 Buff 内部的自定义计数器等）
   * 例如：魔法炮充能计数、阶段标记等
   */
  variables?: Record<string, number | boolean>;
}

// ==================== BuffManager 实现 ====================

export class BuffManager {
  private buffs = new Map<string, BuffInstance>();

  constructor(
    private statContainer: StatContainer<any>,
    private pipelineManager: PipelineManager<any, any, any>,
    private engine: GameEngine,
    private memberId: string,
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
          
          // 创建包装函数，支持字符串表达式或函数
          const wrappedLogic = (context: any, input: any) => {
            if (typeof effect.logic === 'function') {
              // 函数形式：直接调用
              return effect.logic(context, input);
            } else if (typeof effect.logic === 'string' && effect.logic.trim()) {
              // 字符串表达式：执行副作用后返回 input
              try {
                // 构建表达式上下文，包含 Buff 变量和辅助函数
                // 约定：对由 JSProcessor 编译的代码，ctx 满足 ExpressionRuntimeContext 基本形状
                const evalContext = {
                  ...context,
                  // 统一的基础标识字段
                  casterId: (context as any).id ?? this.memberId,
                  targetId: (context as any).targetId,
                  ...(buff.variables || {}),
                  // 注入辅助函数
                  getBuffVar: (buffId: string, name: string) => this.getVariable(buffId, name),
                  setBuffVar: (buffId: string, name: string, value: number) => this.setVariable(buffId, name, value),
                  hasBuff: (buffId: string) => this.hasBuff(buffId),
                };
                
                // 编译并执行表达式（由 GameEngine + JSProcessor 负责）
                const compiledCode = this.engine.compileScript(effect.logic, context.id || '', context.targetId);
                const runner = this.engine.createExpressionRunner(compiledCode);
                runner(evalContext);
                
                // 返回 input，保持数据流一致
                return input;
              } catch (error) {
                console.error(`❌ Buff 表达式执行失败 (${buff.id}):`, error);
                return input;
              }
            } else {
              console.warn(`⚠️ Buff 效果 logic 类型无效 (${buff.id}):`, typeof effect.logic);
              return input;
            }
          };
          
          const cleanup = this.pipelineManager.insertDynamicStage(
            effect.pipeline,
            effect.stage,
            wrappedLogic,
            stageId,
            buff.id, // source = buff.id
            effect.priority ?? 0,
          );

          if (!buff._pipelineStageCleanups) {
            buff._pipelineStageCleanups = [];
          }
          buff._pipelineStageCleanups.push(cleanup);
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

    // 2. 移除管线效果
    if (buff._pipelineStageCleanups) {
      buff._pipelineStageCleanups.forEach((dispose) => dispose());
      buff._pipelineStageCleanups = [];
    }
    this.pipelineManager.removeStagesBySource(buff.id);

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
   * 查询指定来源的动态管线阶段
   */
  getPipelineStagesBySource(source: string) {
    return this.pipelineManager.getDynamicStageInfos({ source });
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

  /**
   * 更新 Buff（处理 frame.update 效果和过期检查）
   * @param currentFrame 当前帧数
   */
  update(currentFrame: number): void {
    // 1. 处理 frame.update 管线的效果（特殊处理，因为这不是真正的管线）
    for (const buff of this.buffs.values()) {
      for (const effect of buff.effects) {
        if (effect.type === "pipeline" && effect.pipeline === "frame.update") {
          // 创建临时上下文执行 frame.update 效果
          const context = {
            currentFrame,
            id: this.memberId,
            buffManager: this,
            engine: this.engine, // 添加 engine 引用，供编译后的代码使用
          };
          
          const wrappedLogic = (ctx: any, input: any) => {
            if (typeof effect.logic === 'function') {
              return effect.logic(ctx, input);
            } else if (typeof effect.logic === 'string' && effect.logic.trim()) {
              try {
                const evalContext = {
                  ...ctx,
                  // 统一基础标识：帧更新始终作用在自身成员上
                  casterId: this.memberId,
                  targetId: undefined,
                  ...(buff.variables || {}),
                  getBuffVar: (buffId: string, name: string) => this.getVariable(buffId, name),
                  setBuffVar: (buffId: string, name: string, value: number) => this.setVariable(buffId, name, value),
                  hasBuff: (buffId: string) => this.hasBuff(buffId),
                };
                const compiledCode = this.engine.compileScript(effect.logic, this.memberId, undefined);
                const runner = this.engine.createExpressionRunner(compiledCode);
                runner(evalContext);
                return input;
              } catch (error) {
                console.error(`❌ Buff frame.update 表达式执行失败 (${buff.id}):`, error);
                return input;
              }
            } else {
              console.warn(`⚠️ Buff frame.update 效果 logic 类型无效 (${buff.id}):`, typeof effect.logic);
              return input;
            }
          };
          
          wrappedLogic(context, {});
        }
      }
    }
    
    // 2. 检查过期 Buff
    this.tick(Date.now());
  }

  /**
   * 检查 Buff 是否存在
   */
  hasBuff(buffId: string): boolean {
    return this.buffs.has(buffId);
  }

  /**
   * 获取 Buff 变量值（不存在则返回 defaultValue 或 0）
   */
  getVariable<T extends number | boolean = number>(buffId: string, name: string, defaultValue?: T): T {
    const buff = this.buffs.get(buffId);
    if (!buff) return (defaultValue ?? (0 as T));
    const value = buff.variables?.[name];
    if (value === undefined || value === null) {
      return (defaultValue ?? (0 as T));
    }
    return value as T;
  }

  /**
   * 设置 Buff 变量值
   */
  setVariable(buffId: string, name: string, value: number | boolean): void {
    const buff = this.buffs.get(buffId);
    if (!buff) return;
    
    if (!buff.variables) {
      buff.variables = {};
    }
    
    const oldValue = buff.variables[name] ?? 0;
    buff.variables[name] = value;
    
    // 输出日志（仅在值变化时）
    if (oldValue !== value) {
      console.log(`🔋 ${buff.name}.${name}: ${oldValue} -> ${value}`);
    }
  }
}
