/**
 * 事件执行器 - 处理战斗时JS逻辑片段
 */

import GameEngine from "../GameEngine";
import { ExpressionContext, ExpressionResult } from "./types";

// ============================== 事件执行器类 ==============================

/**
 * 事件执行器类
 * 处理复杂的事件效果计算
 */
export class EventExecutor {
  // ==================== 私有属性 ====================

  /** 表达式函数库 */
  private expressionFunctions: Map<string, Function> = new Map();

  /** 调试模式 */
  private debugMode: boolean = false;

  /** 游戏引擎引用 */
  private engine: GameEngine;

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   *
   * @param engine 游戏引擎实例
   * @param debugMode 是否启用调试模式
   */
  constructor(engine: GameEngine, debugMode: boolean = false) {
    this.engine = engine;
    this.debugMode = debugMode;
    this.initializeExpressionFunctions();
  }

  // ==================== 公共接口 ====================

  /**
   * 执行JS片段 - 使用GameEngine的编译执行流程
   *
   * @param scriptCode JS代码字符串
   * @param context 执行上下文
   * @returns 执行结果
   */
  executeScript(scriptCode: string, context: ExpressionContext): ExpressionResult {
    try {
      const memberId = context.casterId;
      const targetId = context.targetId;

      if (!memberId) {
        throw new Error("缺少成员ID");
      }

      // 使用GameEngine的编译和执行能力
      const compiledCode = this.engine.compileScript(scriptCode, memberId, targetId);
      // 在 Engine 中未提供 executeScript 时，直接使用 Function 执行并注入必要 API
      const runner = new Function("engine", "ctx", `${compiledCode}`);
      const result = runner.call(this.engine, this.engine, context);

      console.log(`✅ JS脚本执行成功: ${memberId}`);

      return {
        value: result,
        success: true,
      };
    } catch (error) {
      console.error("JS脚本执行失败:", error);
      return {
        value: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 清理JS代码，屏蔽危险关键字
   */
  private sanitizeScript(code: string): string {
    return code
      .replace(/\bthis\b/g, "undefined")
      .replace(/\bglobal\b/g, "undefined")
      .replace(/\bprocess\b/g, "undefined")
      .replace(/\brequire\b/g, "undefined")
      .replace(/\bFunction\b/g, "undefined")
      .replace(/\beval\b/g, "undefined");
  }

  /**
   * 执行表达式计算
   *
   * @param expression 表达式字符串
   * @param context 计算上下文
   * @returns 计算结果
   */
  executeExpression(expression: string, context: ExpressionContext): ExpressionResult {
    try {
      const debugInfo = this.debugMode
        ? {
            expression,
            variables: { ...context },
            steps: [] as string[],
          }
        : undefined;

      // 预处理表达式
      const processedExpression = this.preprocessExpression(expression, context);

      if (debugInfo) {
        debugInfo.steps.push(`预处理后: ${processedExpression}`);
      }

      // 计算表达式
      const value = this.evaluateExpression(processedExpression, context);

      if (debugInfo) {
        debugInfo.steps.push(`计算结果: ${value}`);
      }

      return {
        value,
        success: true,
        debug: debugInfo,
      };
    } catch (error) {
      console.error("表达式计算失败:", error);
      return {
        value: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 启用调试模式
   */
  enableDebugMode(): void {
    this.debugMode = true;
  }

  /**
   * 禁用调试模式
   */
  disableDebugMode(): void {
    this.debugMode = false;
  }

  /**
   * 注册自定义表达式函数
   *
   * @param name 函数名
   * @param func 函数实现
   */
  registerFunction(name: string, func: Function): void {
    this.expressionFunctions.set(name, func);
    console.log(`注册表达式函数: ${name}`);
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化表达式函数库
   */
  private initializeExpressionFunctions(): void {
    // 数学函数
    this.expressionFunctions.set("max", Math.max);
    this.expressionFunctions.set("min", Math.min);
    this.expressionFunctions.set("abs", Math.abs);
    this.expressionFunctions.set("floor", Math.floor);
    this.expressionFunctions.set("ceil", Math.ceil);
    this.expressionFunctions.set("round", Math.round);
    this.expressionFunctions.set("sqrt", Math.sqrt);
    this.expressionFunctions.set("pow", Math.pow);

    // 游戏相关函数
    this.expressionFunctions.set("random", () => Math.random());
    this.expressionFunctions.set(
      "randomInt",
      (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    );
    // console.log("表达式函数库初始化完成");
  }

  /**
   * 预处理表达式
   *
   * @param expression 原始表达式
   * @param context 计算上下文
   * @returns 预处理后的表达式
   */
  private preprocessExpression(expression: string, context: ExpressionContext): string {
    let processed = expression;

    // 替换上下文变量（上下文可能为空，做防御）
    if (context && typeof context === "object") {
      try {
        Object.entries(context).forEach(([key, value]) => {
          if (typeof value === "number") {
            const regex = new RegExp(`\\b${key}\\b`, "g");
            processed = processed.replace(regex, value.toString());
          }
        });
      } catch {
        // ignore
      }
    }

    // 处理成员属性访问
    processed = processed.replace(/(\w+)\.(\w+)/g, (match, obj, prop) => {
      if (context[obj] && typeof context[obj].getStats === "function") {
        const stats = context[obj].getStats();
        return stats[prop] || 0;
      }
      return match;
    });

    return processed;
  }

  /**
   * 计算表达式
   *
   * @param expression 表达式字符串
   * @param context 计算上下文
   * @returns 计算结果
   */
  private evaluateExpression(expression: string, context: ExpressionContext): number {
    // 这里应该使用安全的表达式计算器
    // 为了简化，我们使用简单的字符串替换和 eval
    // 在生产环境中，应该使用专门的表达式解析器

    try {
      // 创建函数执行环境
      const functionContext = Object.fromEntries(this.expressionFunctions.entries());

      // 创建安全的执行环境
      const safeEval = new Function(...Object.keys(functionContext), `return ${expression}`);
      console.log("safeEval", safeEval);

      return safeEval(...Object.values(functionContext));
    } catch (error) {
      console.warn(`表达式计算失败: ${expression}`, error);
      return 0;
    }
  }
}

// ============================== 导出 ==============================

export default EventExecutor;
