/**
 * JS表达式集成层
 * 
 * 负责将JSExpressionProcessor与ReactiveSystem集成
 * 提供高级API供EventExecutor使用
 */

import JSExpressionProcessor, { type ValidationResult, type TransformResult, type ExecutionContext } from './JSExpressionProcessor';
import type { ReactiveSystem } from '../member/ReactiveSystem';

// ============================== 集成接口 ==============================

export interface ProcessorConfig {
  enableTransformation: boolean;    // 是否启用数据操作转换
  enableValidation: boolean;        // 是否启用安全验证
  strictMode: boolean;              // 严格模式
}

export interface ExecutionResult {
  success: boolean;
  value: any;
  dataOperationsApplied: number;    // 应用的数据操作数量
  warnings: string[];
  error?: string;
}

// ============================== 集成处理器 ==============================

export class JSExpressionIntegration {
  private processor: JSExpressionProcessor;
  private config: ProcessorConfig;

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.processor = new JSExpressionProcessor();
    this.config = {
      enableTransformation: true,
      enableValidation: true,
      strictMode: false,
      ...config
    };
  }

  /**
   * 处理并执行JS表达式
   * 这是主要的集成API
   */
  processAndExecute(
    code: string, 
    context: ExecutionContext
  ): ExecutionResult {
    try {
      // 1. 验证代码（如果启用）
      if (this.config.enableValidation) {
        const validation = this.processor.validate(code);
        if (!validation.isValid) {
          return {
            success: false,
            value: null,
            dataOperationsApplied: 0,
            warnings: validation.warnings,
            error: `验证失败: ${validation.errors.join(', ')}`
          };
        }
      }

      // 2. 转换数据操作（如果启用）
      let finalCode = code;
      let dataOperationsCount = 0;
      
      if (this.config.enableTransformation) {
        const transformation = this.processor.transform(code);
        if (!transformation.success) {
          return {
            success: false,
            value: null,
            dataOperationsApplied: 0,
            warnings: [],
            error: `转换失败: ${transformation.error}`
          };
        }
        
        finalCode = transformation.transformedCode;
        dataOperationsCount = transformation.dataOperations.length;
        
        // 应用数据操作到ReactiveSystem
        this.applyDataOperations(transformation.dataOperations, context);
      }

      // 3. 执行转换后的代码
      const result = this.executeCode(finalCode, context);

      return {
        success: true,
        value: result,
        dataOperationsApplied: dataOperationsCount,
        warnings: []
      };

    } catch (error) {
      return {
        success: false,
        value: null,
        dataOperationsApplied: 0,
        warnings: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 应用数据操作到ReactiveSystem
   */
  private applyDataOperations(operations: any[], context: ExecutionContext): void {
    const reactiveSystem = context.reactiveSystem as ReactiveSystem<any>;
    if (!reactiveSystem) {
      console.warn('ReactiveSystem not available in context');
      return;
    }

    for (const op of operations) {
      try {
        switch (op.type) {
          case 'modifier':
            this.applyModifierOperation(op, reactiveSystem);
            break;
          case 'setter':
            this.applySetterOperation(op, reactiveSystem);
            break;
          case 'method':
            this.applyMethodOperation(op, context);
            break;
        }
      } catch (error) {
        console.error(`应用数据操作失败:`, op, error);
      }
    }
  }

  /**
   * 应用修饰符操作
   */
  private applyModifierOperation(op: any, reactiveSystem: ReactiveSystem<any>): void {
    const modifierType = op.operation === 'add' ? 'percentage' : 'flat';
    const value = op.operation === 'subtract' ? -op.value : op.value;
    
    reactiveSystem.addModifier(op.target, modifierType as any, value, {
      id: `js_expr_${Date.now()}`,
      type: 'system',
      name: 'JS Expression'
    });
    
    console.log(`✅ 应用修饰符: ${op.target} ${op.operation} ${op.value}%`);
  }

  /**
   * 应用设值操作
   */
  private applySetterOperation(op: any, reactiveSystem: ReactiveSystem<any>): void {
    reactiveSystem.setBaseValue(op.target, op.value);
    console.log(`✅ 设置属性: ${op.target} = ${op.value}`);
  }

  /**
   * 应用方法操作
   */
  private applyMethodOperation(op: any, context: ExecutionContext): void {
    const member = context.member;
    if (!member) {
      console.warn('Member not available in context for method operation');
      return;
    }

    // 执行成员方法
    if (typeof member[op.target] === 'function') {
      const args = typeof op.value === 'string' ? [parseFloat(op.value)] : [op.value];
      member[op.target](...args);
      console.log(`✅ 调用方法: ${op.target}(${args.join(', ')})`);
    }
  }

  /**
   * 在沙盒中执行代码
   */
  private executeCode(code: string, context: ExecutionContext): any {
    // 创建安全的执行环境
    const safeContext = this.createSafeContext(context);
    
    // 检查代码是否需要return包装
    const needsReturn = !code.includes('return') && 
                       !code.includes(';') && 
                       !code.includes('var ') && 
                       !code.includes('let ') && 
                       !code.includes('const ') &&
                       !code.includes('function ') &&
                       !code.includes('if ') &&
                       !code.includes('for ') &&
                       !code.includes('while ');
    
    const wrappedCode = needsReturn ? `return ${code}` : code;
    
    // 使用Function构造器执行
    const fn = new Function('ctx', `
      with (ctx) {
        ${wrappedCode}
      }
    `);
    
    return fn(safeContext);
  }

  /**
   * 创建执行上下文
   * 由于GameEngine层已进行沙盒化，直接传递所有属性
   */
  private createSafeContext(context: ExecutionContext): any {
    // 直接返回传入的context，因为GameEngine层已经处理了安全性
    return context;
  }

  /**
   * 仅验证代码，不执行
   */
  validateOnly(code: string): ValidationResult {
    return this.processor.validate(code);
  }

  /**
   * 仅转换代码，不执行
   */
  transformOnly(code: string): TransformResult {
    return this.processor.transform(code);
  }
}

// ============================== 导出 ==============================

export default JSExpressionIntegration;