/**
 * StatContainer专用AST编译器 - 精确属性路径解析
 *
 * 专门处理StatContainer中的属性表达式，所有表达式都以自身为目标
 * 支持：abi.vit, weapon.attack.physical, lv, str 等属性路径
 */

import { parse } from "acorn";
import type { Node, Program, Identifier, MemberExpression, Literal } from "acorn";
import { JSProcessor } from "../../../JSProcessor/JSProcessor";

export interface ASTCompileResult {
  success: boolean;
  compiledCode: string;
  dependencies: string[];
  error?: string;
  replacements: number;
}

export class StatContainerASTCompiler {
  private knownAttributes: Set<string>;
  private currentAttributeName?: string;

  constructor(knownAttributes: string[], currentAttributeName?: string) {
    this.knownAttributes = new Set(knownAttributes);
    this.currentAttributeName = currentAttributeName;
  }

  /**
   * 编译表达式，使用AST精确解析
   */
  compile(expression: string): ASTCompileResult {
    const result: ASTCompileResult = {
      success: false,
      compiledCode: expression,
      dependencies: [],
      replacements: 0,
    };

    try {
      // 静默编译，不打印调试信息

      // 1. 检查简单情况
      if (this.isSimpleValue(expression)) {
        result.success = true;
        result.compiledCode = expression;
        console.log(`📝 简单值，无需处理: "${expression}"`);
        return result;
      }

      // 2. 解析AST
      let ast: Program;
      try {
        ast = parse(expression, {
          ecmaVersion: 2020,
          sourceType: "script",
        });
      } catch (parseError) {
        result.error = `AST解析失败: ${parseError instanceof Error ? parseError.message : "Unknown error"}`;
        console.error(`❌ ${result.error}`);
        return result;
      }

      // 3. 收集需要替换的节点
      const replacements = this.collectReplacements(ast, expression);

      // 4. 应用替换
      let compiledCode = this.applyReplacements(expression, replacements);

      // 5. 收集依赖
      const dependencies = [...new Set(replacements.map((r) => r.attributeKey))];

      result.success = true;
      result.compiledCode = compiledCode;
      result.dependencies = dependencies;
      result.replacements = replacements.length;

      // 静默编译完成

      return result;
    } catch (error) {
      result.error = `编译错误: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(`❌ ${result.error}`);
      return result;
    }
  }

  /**
   * 检查是否为简单值（数字、字符串等）
   */
  private isSimpleValue(expression: string): boolean {
    const trimmed = expression.trim();

    // 数字
    if (!isNaN(Number(trimmed)) && isFinite(Number(trimmed))) {
      return true;
    }

    // 字符串字面量
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return true;
    }

    // 布尔值
    if (trimmed === "true" || trimmed === "false") {
      return true;
    }

    // null/undefined
    if (trimmed === "null" || trimmed === "undefined") {
      return true;
    }

    return false;
  }

  /**
   * 收集需要替换的节点信息
   */
  private collectReplacements(
    ast: Program,
    expression: string,
  ): Array<{
    start: number;
    end: number;
    originalText: string;
    replacement: string;
    attributeKey: string;
    nodeType: "member-expression" | "identifier";
  }> {
    const replacements: Array<{
      start: number;
      end: number;
      originalText: string;
      replacement: string;
      attributeKey: string;
      nodeType: "member-expression" | "identifier";
    }> = [];

    JSProcessor.walkAST(ast, (node: Node) => {
      // 处理所有成员表达式（如 abi.vit, weapon.attack.physical 等）
      if (node.type === "MemberExpression") {
        const memberExpr = node as MemberExpression;
        const propertyPath = this.buildPropertyPath(memberExpr);

        // 检查是否为已知属性路径
        if (
          propertyPath &&
          this.knownAttributes.has(propertyPath) &&
          propertyPath !== this.currentAttributeName &&
          node.start !== undefined &&
          node.end !== undefined
        ) {
          const originalText = expression.substring(node.start, node.end);
          replacements.push({
            start: node.start,
            end: node.end,
            originalText,
            replacement: `_get('${propertyPath}')`,
            attributeKey: propertyPath,
            nodeType: "member-expression",
          });
          // 静默发现属性路径
        }
      }

      // 处理直接属性名引用（如 lv, str 等）
      if (node.type === "Identifier" && !this.isInMemberExpression(node, ast)) {
        const identifier = node as Identifier;
        const attrName = identifier.name;

        // 检查是否为已知属性且不为当前属性（避免自引用）且不是保护的标识符
        if (
          this.knownAttributes.has(attrName) &&
          attrName !== this.currentAttributeName &&
          !this.isProtectedIdentifier(attrName) &&
          node.start !== undefined &&
          node.end !== undefined
        ) {
          const originalText = expression.substring(node.start, node.end);
          replacements.push({
            start: node.start,
            end: node.end,
            originalText,
            replacement: `_get('${attrName}')`,
            attributeKey: attrName,
            nodeType: "identifier",
          });
          // 静默发现属性引用
        }
      }
    });

    return replacements;
  }

  /**
   * 构建成员表达式的完整属性路径
   */
  private buildPropertyPath(memberExpr: MemberExpression): string | null {
    const parts: string[] = [];

    function traverse(node: MemberExpression | Identifier): boolean {
      if (node.type === "Identifier") {
        parts.unshift(node.name);
        return true;
      } else if (node.type === "MemberExpression") {
        if (node.property.type === "Identifier") {
          parts.unshift(node.property.name);
          return traverse(node.object as MemberExpression | Identifier);
        }
      }
      return false;
    }

    if (traverse(memberExpr)) {
      return parts.join(".");
    }

    return null;
  }

  /**
   * 检查标识符是否在成员表达式中（作为属性）
   */
  private isInMemberExpression(targetNode: Node, ast: Program): boolean {
    let isInMember = false;

    JSProcessor.walkAST(ast, (node: Node) => {
      if (node.type === "MemberExpression") {
        const memberExpr = node as MemberExpression;
        if (memberExpr.property === targetNode) {
          isInMember = true;
        }
      }
    });

    return isInMember;
  }

  /**
   * 检查标识符是否为受保护的（不应被替换）
   */
  private isProtectedIdentifier(name: string): boolean {
    const protectedNames = [
      "Math",
      "Number",
      "String",
      "Boolean",
      "Object",
      "Array",
      "parseInt",
      "parseFloat",
      "isNaN",
      "isFinite",
      "floor",
      "ceil",
      "round",
      "abs",
      "min",
      "max",
      "pow",
      "true",
      "false",
      "null",
      "undefined",
      "console",
      "window",
      "document",
      "eval",
      "Function",
    ];
    return protectedNames.includes(name);
  }

  /**
   * 应用替换，从后往前避免位置偏移
   */
  private applyReplacements(
    expression: string,
    replacements: Array<{
      start: number;
      end: number;
      replacement: string;
    }>,
  ): string {
    // 按位置从后向前排序
    const sortedReplacements = [...replacements].sort((a, b) => b.start - a.start);

    let result = expression;
    for (const replacement of sortedReplacements) {
      result = result.substring(0, replacement.start) + replacement.replacement + result.substring(replacement.end);
    }

    return result;
  }
}
