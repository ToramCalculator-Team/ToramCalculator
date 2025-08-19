/**
 * JS表达式处理器 - 纯编译工具
 *
 * 核心功能：
 * 1. 验证JS代码的安全性和正确性
 * 2. 编译JS代码，替换属性访问为ReactiveSystem调用
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
import type { NestedSchema } from "../member/ReactiveSystem";
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

export class JSExpressionProcessor {
  private schemaResolver: SchemaPathResolver | null = null;

  // ==================== 核心编译功能 ====================

  /**
   * 编译JS代码 - 核心功能
   * 将self.xxx转换为_self.getValue('xxx')格式
   */
  compile(code: string, context: CompilationContext): CompileResult {
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
      const memberRef = access.accessor === "self" ? "_self" : "_target";
      const replacement = `${memberRef}.getValue('${access.reactiveKey}')`;

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
    
    // 调试信息
    console.log(`🔧 JSExpressionProcessor: 原始代码: ${originalCode}`);
    console.log(`🔧 JSExpressionProcessor: 属性访问: ${propertyAccesses.length} 个`);
    console.log(`🔧 JSExpressionProcessor: 简单表达式: ${this.isSimpleExpression(originalCode)}`);
    console.log(`🔧 JSExpressionProcessor: 生成的代码: ${finalCode}`);
    
    return finalCode;
  }

  /**
   * 判断是否为简单表达式
   */
  private isSimpleExpression(code: string): boolean {
    const trimmed = code.trim();
    // 简单表达式的特征：不包含语句分隔符、控制流等
    return !trimmed.includes(';') && 
           !trimmed.includes('{') && 
           !trimmed.includes('}') && 
           !trimmed.includes('return') &&
           !trimmed.includes('if') &&
           !trimmed.includes('for') &&
           !trimmed.includes('while') &&
           !trimmed.includes('function');
  }

  /**
   * 生成上下文注入代码
   */
  private generateContextInjection(context: CompilationContext): string {
    // 为脚本提供与架构解耦的访问器对象，避免直接依赖 Actor/Member 实现
    const wrapAccessor = (id: string) =>
      `({ getValue: (key) => {
            const member = ctx.engine.getMemberManager().getMember('${id}');
            return member.rs.getValue(key);
        } })`;

    const lines: string[] = [];
    lines.push(`const _self = ${wrapAccessor(context.memberId)};`);
    if (context.targetId) {
      lines.push(`const _target = ${wrapAccessor(context.targetId)};`);
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

    this.walkAST(ast, (node: Node) => {
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

    this.walkAST(ast, (node: Node) => {
      if (node.type === "ReturnStatement") {
        hasReturn = true;
      }
    });

    // 对于简单表达式，建议有返回值
    if (!hasReturn && ast.body.length === 1 && ast.body[0].type === "ExpressionStatement") {
      result.warnings.push("建议添加return语句以返回计算结果");
    }
  }

  // ==================== 工具方法 ====================

  private isNode(value: any): value is Node {
    return value && typeof value === "object" && typeof value.type === "string";
  }
  

  /**
   * 遍历AST
   */
  private walkAST(node: Node, callback: (node: Node) => void): void {
    callback(node);
  
    for (const key of Object.keys(node)) {
      const value = node[key as keyof Node];
  
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object" && "type" in item) {
            this.walkAST(item as Node, callback);
          }
        }
      } else if (this.isNode(value)) {
        this.walkAST(value, callback);
      }
    }
  }
  
}

// ============================== 导出 ==============================

export default JSExpressionProcessor;
