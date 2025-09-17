/**
 * 管线管理器 - 实例化版本，支持Member级别的管线管理
 * 
 * 设计思路：
 * 1. 每个Member都有自己的PipelineManager实例
 * 2. 固定管线阶段来自各自的ActionPipelines定义
 * 3. 动态管线阶段由技能效果插入，存储格式：{stageName: CustomPipelineStage[]}
 * 4. 执行时：基础阶段 -> 动态阶段（按priority排序）
 */

import { z } from "zod";
import type { 
  PipelineStageHandlers, 
  ActionPipelineConfig 
} from "./PipelineStageType";

// ==================== 类型定义 ====================

/**
 * 动态管线阶段
 * 用于在运行时动态插入到固定管线阶段后面
 */
export interface CustomPipelineStage {
  /** 唯一标识 */
  id: string;
  /** 来源标识（如buff ID或"combat_init"） */
  source: string;
  /** 处理函数 */
  logic: (context: any, stageInput: any) => any;
  /** 优先级，数字越小越先执行 */
  priority: number;
  /** 描述 */
  description?: string;
}

/**
 * 管线执行结果
 */
export interface PipelineExecutionResult {
  success: boolean;
  result?: any;
  error?: Error;
  stageResults: Record<string, any>;
  executionTime: number;
}

// ==================== 管线管理器  ====================

/**
 * 实例化的管线管理器
 * 每个Member都有自己的实例，管理固定+动态管线阶段
 */
export class PipelineManager<
  TActions extends string,
  TPipelineDefinitions extends ActionsPipelineDefinitions<TActions>,
  TExternalContext = {}
  > {
  /** 固定管线阶段定义 */
  private basePipelineDefinitions: TPipelineDefinitions;
  
  /** 固定管线阶段处理器 */
  private basePipelineHandlers: {
    [K in TActions]: PipelineStageHandlers<TPipelineDefinitions[K], TExternalContext>
  };
  
  /** 动态管线阶段存储：{stageName: CustomPipelineStage[]} */
  private dynamicStages: Map<string, CustomPipelineStage[]> = new Map();
  
  /** 管线缓存：{actionName: CompiledPipeline} */
  private pipelineCache: Map<string, CompiledPipeline> = new Map();
  
  /** 缓存版本，用于失效检测 */
  private cacheVersion: number = 0;

  constructor(
    basePipelineDefinitions: TPipelineDefinitions,
    basePipelineHandlers: {
      [K in TActions]: PipelineStageHandlers<TPipelineDefinitions[K], TExternalContext>
    }
  ) {
    console.log(basePipelineDefinitions, basePipelineHandlers)
    this.basePipelineDefinitions = basePipelineDefinitions;
    this.basePipelineHandlers = basePipelineHandlers;
  }

  // ==================== 动态管线阶段管理 ====================

  /**
   * 插入动态管线阶段
   */
  insertStage(stageName: string, customStage: CustomPipelineStage): void {
    const stages = this.dynamicStages.get(stageName) || [];
    stages.push(customStage);
    
    // 按优先级排序
    stages.sort((a, b) => a.priority - b.priority);
    
    this.dynamicStages.set(stageName, stages);
    this.invalidateCache();
    
    console.log(`📝 PipelineManager: 插入动态阶段 ${stageName}:${customStage.id}`);
  }

  /**
   * 移除指定来源的所有动态管线阶段
   */
  removeStagesBySource(source: string): void {
    let removed = 0;
    
    for (const [stageName, stages] of this.dynamicStages) {
      const filteredStages = stages.filter(stage => stage.source !== source);
      if (filteredStages.length !== stages.length) {
        removed += stages.length - filteredStages.length;
        if (filteredStages.length === 0) {
          this.dynamicStages.delete(stageName);
        } else {
          this.dynamicStages.set(stageName, filteredStages);
        }
      }
    }
    
    if (removed > 0) {
      this.invalidateCache();
      console.log(`🗑️ PipelineManager: 移除来源 ${source} 的 ${removed} 个动态阶段`);
    }
  }

  /**
   * 获取指定阶段的动态管线阶段
   */
  getDynamicStages(stageName: string): CustomPipelineStage[] {
    return this.dynamicStages.get(stageName) || [];
  }

  /**
   * 获取动态阶段统计信息
   */
  getDynamicStageStats(): { totalStages: number; stagesBySource: Record<string, number> } {
    const stagesBySource: Record<string, number> = {};
    let totalStages = 0;
    
    for (const stages of this.dynamicStages.values()) {
      totalStages += stages.length;
      for (const stage of stages) {
        stagesBySource[stage.source] = (stagesBySource[stage.source] || 0) + 1;
      }
    }
    
    return { totalStages, stagesBySource };
  }

  // ==================== 管线执行 ====================

  /**
   * 执行完整管线
   */
  executePipeline(
    actionName: TActions,
    context: any,
    input: any
  ): PipelineExecutionResult {
    const startTime = performance.now();
    
    try {
      // 获取或编译管线
      const pipeline = this.getOrCompilePipeline(actionName);
      
      if (!pipeline) {
        return {
          success: false,
          error: new Error(`未找到管线定义: ${actionName}`),
          stageResults: {},
          executionTime: performance.now() - startTime
        };
      }

      // 执行管线
      const stageResults: Record<string, any> = {};
      let currentInput = input;
      
      for (const stage of pipeline.stages) {
        try {
          // 构建阶段上下文（包含之前阶段的输出）
          const stageContext = { ...context, ...stageResults };
          
          console.log(`🔧 执行管线阶段: ${actionName}.${stage.name}`);
          
          // 执行基础处理器
          if (stage.baseHandler) {
            currentInput = stage.baseHandler(stageContext, currentInput);
          }
          
          // 执行动态阶段
          for (const customStage of stage.dynamicStages) {
            console.log(`  └─ 动态阶段: ${customStage.id} (${customStage.description})`);
            currentInput = customStage.logic(stageContext, currentInput);
          }
          
          // 保存阶段结果
          stageResults[stage.outputKey] = currentInput;
          
        } catch (error) {
          console.error(`❌ 管线阶段执行失败: ${actionName}.${stage.name}`, error);
          return {
            success: false,
            error: error as Error,
            stageResults,
            executionTime: performance.now() - startTime
          };
        }
      }
      
      console.log(`✅ 管线执行完成: ${actionName}`, stageResults);
      
      return {
        success: true,
        result: currentInput,
        stageResults,
        executionTime: performance.now() - startTime
      };
      
    } catch (error) {
      console.error(`❌ 管线执行失败: ${actionName}`, error);
      return {
        success: false,
        error: error as Error,
        stageResults: {},
        executionTime: performance.now() - startTime
      };
    }
  }

  // ==================== 管线编译和缓存 ====================

  private getOrCompilePipeline(actionName: TActions): CompiledPipeline | null {
    // 检查缓存
    const cached = this.pipelineCache.get(actionName);
    if (cached && cached.version === this.cacheVersion) {
      return cached;
    }
    
    // 编译新管线
    const compiled = this.compilePipeline(actionName);
    if (compiled) {
      this.pipelineCache.set(actionName, compiled);
    }
    
    return compiled;
  }

  private compilePipeline(actionName: TActions): CompiledPipeline | null {
    console.log(this.basePipelineDefinitions, actionName, this.basePipelineDefinitions[actionName])
    const pipelineDefinition = this.basePipelineDefinitions[actionName];
    if (!pipelineDefinition || pipelineDefinition.length === 0) {
      throw new Error(`未找到管线定义: ${actionName}`);
    }
    
    const baseHandlers = this.basePipelineHandlers[actionName];
    const stages: CompiledStage[] = [];
    
    for (const [stageName, outputKey, schema] of pipelineDefinition) {
      const fullStageName = `${actionName}.${stageName}`;
      const dynamicStages = this.getDynamicStages(fullStageName);
      
      stages.push({
        name: stageName,
        outputKey,
        schema,
        baseHandler: baseHandlers ? (baseHandlers as any)[stageName] : undefined,
        dynamicStages
      });
    }
    
    return {
      actionName,
      stages,
      version: this.cacheVersion
    };
  }

  private invalidateCache(): void {
    this.cacheVersion++;
    this.pipelineCache.clear();
    console.log(`🔄 PipelineManager: 缓存已失效，版本: ${this.cacheVersion}`);
  }

  // ==================== 调试和状态查询 ====================

  /**
   * 获取调试信息
   */
  getDebugInfo(): any {
    return {
      dynamicStagesCount: Array.from(this.dynamicStages.values())
        .reduce((sum, stages) => sum + stages.length, 0),
      cacheVersion: this.cacheVersion,
      cachedPipelines: Array.from(this.pipelineCache.keys()),
      dynamicStagesByStage: Object.fromEntries(
        Array.from(this.dynamicStages.entries()).map(([stageName, stages]) => [
          stageName,
          stages.map(s => ({ id: s.id, source: s.source, priority: s.priority }))
        ])
      )
    };
  }

  /**
   * 获取所有动态阶段
   */
  getAllDynamicStages(): Map<string, CustomPipelineStage[]> {
    return new Map(this.dynamicStages);
  }
}

// ==================== 编译后的管线结构 ====================

interface CompiledStage {
  name: string;
  outputKey: string;
  schema: z.ZodType<any>;
  baseHandler?: (context: any, input: any) => any;
  dynamicStages: CustomPipelineStage[];
}

interface CompiledPipeline {
  actionName: string;
  stages: CompiledStage[];
  version: number;
}
