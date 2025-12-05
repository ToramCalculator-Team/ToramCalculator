/**
 * JS表达式处理器 - 纯编译工具
 *
 * 核心功能：
 * 1. 验证JS代码的安全性和正确性
 * 2. 编译JS代码，替换属性访问为StatContainer调用
 * 3. 生成可缓存的编译结果
 *
 * 设计理念：
 * - 纯编译工具：只负责代码转换，不执行代码
 * - Schema驱动：基于Schema进行属性路径解析
 * - 缓存友好：生成可缓存的编译结果
 * - 高性能：编译一次，多次执行
 */

import { parse } from "acorn";
import type { Node, Program } from "acorn";
import type { NestedSchema } from "../Member/runtime/StatContainer/SchemaTypes";
import { SchemaPathResolver, type SchemaPath, escapeRegExp } from "./SchemaPathResolver";

// ============================== 类型定义 ==============================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
}

export interface CompilationContext {
  /** 成员ID */
  memberId: string;
  /** 目标成员ID (可选) */
  targetId?: string;
  /** Schema定义 */
  schema: NestedSchema;
  /** 编译选项 */
  options?: {
    enableCaching?: boolean;
    enableValidation?: boolean;
  };
}

export interface CompileResult {
  success: boolean;
  compiledCode: string;
  dependencies: string[];
  cacheKey: string;
  error?: string;
  warnings?: string[];
}

// ============================== 核心处理器 ==============================

export class JSProcessor {
  private schemaResolver: SchemaPathResolver | null = null;

  /**
   * 源码级编译结果缓存
   *
   * - 只缓存编译结果（compiledCode + dependencies）
   * - 不缓存执行结果
   * - 当前 key 使用 (memberId + hash(code))，即“按成员 + 源码”维度缓存
   *   后续如需按 schema 维度细化，可在不改调用方的前提下调整 generateCacheKey 实现
   */
  private readonly compilationCache: Map<
    string,
    {
      compiledCode: string;
      dependencies: string[];
    }
  > = new Map();

  private readonly cacheStats = {
    hits: 0,
    misses: 0,
  };

  // ==================== 核心编译功能 ====================

  /**
   * 编译JS代码 - 核心功能
   * 将self.xxx转换为_statContainer.getValue('xxx')格式
   */
  compile(code: string, context: CompilationContext): CompileResult {
    // console.log("🔧 编译代码: ", code);
    try {
      // 1. 语法验证
      if (context.options?.enableValidation !== false) {
        const validation = this.validate(code);
        if (!validation.isValid) {
          return {
            success: false,
            compiledCode: "",
            dependencies: [],
            cacheKey: "",
            error: `验证失败: ${validation.errors.join(", ")}`,
            warnings: validation.warnings,
          };
        }
      }

      // 2. 初始化Schema解析器
      this.schemaResolver = new SchemaPathResolver(context.schema);

      // 3. 提取属性访问
      const pathResolution = this.schemaResolver.extractPropertyAccesses(code);

      if (pathResolution.invalidPaths.length > 0) {
        return {
          success: false,
          compiledCode: "",
          dependencies: [],
          cacheKey: "",
          error: `无效的属性路径: ${pathResolution.invalidPaths.join(", ")}`,
          warnings: pathResolution.warnings,
        };
      }

      // 4. 生成编译后的代码
      const compiledCode = this.generateCompiledCode(code, pathResolution.resolvedPaths, context);

      // 5. 生成缓存键
      const cacheKey = this.generateCacheKey(code, context.memberId);

      // 6. 提取依赖关系
      const dependencies = [...new Set(pathResolution.resolvedPaths.map((access) => access.reactiveKey))];

      return {
        success: true,
        compiledCode,
        dependencies,
        cacheKey,
        warnings: pathResolution.warnings,
      };
    } catch (error) {
      return {
        success: false,
        compiledCode: "",
        dependencies: [],
        cacheKey: "",
        error: error instanceof Error ? error.message : "Unknown compilation error",
      };
    }
  }

  // ==================== 编译缓存 API ====================

  /**
   * 使用内部缓存的编译接口
   *
   * 约定：
   * - 仅缓存编译结果（compiledCode + dependencies）
   * - key 当前使用 (memberId + hash(code))，即“按成员 + 源码”维度缓存
   */
  compileWithCache(code: string, context: CompilationContext): CompileResult {
    const cacheKey = this.generateCacheKey(code, context.memberId);
    const cached = this.compilationCache.get(cacheKey);

    if (cached) {
      this.cacheStats.hits += 1;
      return {
        success: true,
        compiledCode: cached.compiledCode,
        dependencies: cached.dependencies,
        cacheKey,
      };
    }

    this.cacheStats.misses += 1;
    const result = this.compile(code, context);
    if (result.success) {
      this.compilationCache.set(cacheKey, {
        compiledCode: result.compiledCode,
        dependencies: result.dependencies,
      });
    }
    return result;
  }

  /**
   * 获取编译缓存统计信息
   */
  getCacheStats(): { cacheSize: number; hits: number; misses: number } {
    return {
      cacheSize: this.compilationCache.size,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
    };
  }

  /**
   * 清空编译缓存
   */
  clearCache(): void {
    this.compilationCache.clear();
    this.cacheStats.hits = 0;
    this.cacheStats.misses = 0;
  }

  // ==================== 私有方法 ====================

  /**
   * 生成编译后的代码
   */
  private generateCompiledCode(
    originalCode: string,
    propertyAccesses: SchemaPath[],
    context: CompilationContext,
  ): string {
    let compiledCode = originalCode;

    // 按字符串长度降序排序，避免替换冲突
    propertyAccesses.sort((a, b) => b.fullExpression.length - a.fullExpression.length);

    // 替换属性访问
    for (const access of propertyAccesses) {
      let replacement: string;
      
      // 检查是否为 getValue 格式
      if (access.fullExpression.includes('.statContainer.getValue(')) {
        // 对于 self.statContainer.getValue("xxx") 格式，保持原有结构，只替换引号
        // 这样可以保持代码的可读性，同时确保语法正确
        replacement = access.fullExpression.replace(/["']([^"']+)["']/, `'${access.reactiveKey}'`);
      } else {
        // 对于传统的 self.xxx 格式，替换为 self.statContainer.getValue('xxx')
        const memberRef = access.accessor === "self" ? "self" : "target";
        replacement = `${memberRef}.statContainer.getValue('${access.reactiveKey}')`;
      }

      compiledCode = compiledCode.replace(new RegExp(escapeRegExp(access.fullExpression), "g"), replacement);
    }

    // 注入上下文声明
    const contextInjection = this.generateContextInjection(context);

    // 确保生成的代码格式正确
    // 如果原始代码是简单表达式，需要确保有返回值
    let finalCode: string;

    if (propertyAccesses.length === 0 && this.isSimpleExpression(originalCode)) {
      // 简单表达式：包装在 return 语句中
      finalCode = `${contextInjection}\nreturn ${compiledCode};`;
    } else {
      // 复杂代码：直接拼接
      finalCode = `${contextInjection}\n${compiledCode}`;
    }

    return finalCode;
  }

  /**
   * 判断是否为简单表达式
   */
  private isSimpleExpression(code: string): boolean {
    const trimmed = code.trim();
    // 简单表达式的特征：不包含语句分隔符、控制流等
    return (
      !trimmed.includes(";") &&
      !trimmed.includes("{") &&
      !trimmed.includes("}") &&
      !trimmed.includes("return") &&
      !trimmed.includes("if") &&
      !trimmed.includes("for") &&
      !trimmed.includes("while") &&
      !trimmed.includes("function")
    );
  }

  /**
   * 生成上下文注入代码
   */
  private generateContextInjection(context: CompilationContext): string {
    // 直接注入 self 和 target 对象，提供完整的 Member 访问能力
    const lines: string[] = [];
    
    // 注入 self 对象
    lines.push(`const self = ctx.engine.getMemberManager().getMember('${context.memberId}');`);
    
    // 注入 target 对象（如果存在）
    if (context.targetId) {
      lines.push(`const target = ctx.engine.getMemberManager().getMember('${context.targetId}');`);
    }
    
    // 为了向后兼容，也保留 _self 和 _target
    lines.push(`const _self = self;`);
    if (context.targetId) {
      lines.push(`const _target = target;`);
    }
    
    return lines.join("\n");
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(code: string, memberId: string): string {
    const hash = this.simpleHash(code);
    return `${memberId}_${hash}`;
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ==================== 验证功能 ====================

  /**
   * 验证JS代码的安全性和正确性
   */
  validate(code: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityIssues: [],
    };

    try {
      // 1. 语法解析检查
      let ast: Program;

      try {
        // 首先尝试直接解析
        ast = parse(code, {
          ecmaVersion: 2020,
          sourceType: "script",
        });
      } catch (parseError) {
        // 如果直接解析失败，尝试作为表达式解析
        try {
          const expressionCode = `(${code})`;
          ast = parse(expressionCode, {
            ecmaVersion: 2020,
            sourceType: "script",
          });
          result.warnings.push("代码已作为表达式进行验证");
        } catch (expressionError) {
          result.isValid = false;
          result.errors.push(`语法解析错误: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
          return result;
        }
      }

      // 2. 安全性检查
      this.checkSecurity(ast, result);

      // 3. 语法正确性检查
      this.checkSyntax(ast, result);
    } catch (error) {
      result.isValid = false;
      result.errors.push(`验证过程错误: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    result.isValid = result.errors.length === 0 && result.securityIssues.length === 0;
    return result;
  }

  /**
   * 安全性检查
   */
  private checkSecurity(ast: Program, result: ValidationResult): void {
    // 检查危险操作
    const dangerousPatterns = [
      "eval",
      "Function",
      "setTimeout",
      "setInterval",
      "require",
      "import",
      "process",
      "global",
      "window",
    ];

    JSProcessor.walkAST(ast, (node: Node) => {
      if (node.type === "Identifier") {
        const identifier = node;
        if (dangerousPatterns.includes(identifier.type)) {
          result.securityIssues.push(`检测到危险操作: ${identifier.type}`);
        }
      }
    });
  }

  /**
   * 语法正确性检查
   */
  private checkSyntax(ast: Program, result: ValidationResult): void {
    // 检查基本语法规则
    let hasReturn = false;

    JSProcessor.walkAST(ast, (node: Node) => {
      if (node.type === "ReturnStatement") {
        hasReturn = true;
      }
    });

    // 对于简单表达式，建议有返回值
    if (!hasReturn && ast.body.length === 1 && ast.body[0].type === "ExpressionStatement") {
      result.warnings.push("建议添加return语句以返回计算结果");
    }
  }

  // ==================== 静态工具方法 ====================

  /**
   * 遍历AST - 通用工具方法
   * 可以在多个地方复用
   */
  static walkAST(node: Node, callback: (node: Node) => void): void {
    callback(node);

    for (const key of Object.keys(node)) {
      const value = node[key as keyof Node];

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object" && "type" in item) {
            JSProcessor.walkAST(item as Node, callback);
          }
        }
      } else if (JSProcessor.isNode(value)) {
        JSProcessor.walkAST(value, callback);
      }
    }
  }

  /**
   * 检查值是否为AST节点
   */
  static isNode(value: any): value is Node {
    return value && typeof value === "object" && typeof value.type === "string";
  }
}
