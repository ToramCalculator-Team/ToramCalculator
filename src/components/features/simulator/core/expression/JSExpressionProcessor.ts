/**
 * JS表达式处理器
 * 
 * 核心功能：
 * 1. 验证JS代码的安全性和正确性
 * 2. 转换数据操作为ReactiveSystem调用
 * 3. 在沙盒环境中安全执行
 * 
 * 支持场景：
 * - Blockly生成的JS片段
 * - 装备属性的简单表达式
 * - 技能效果的复杂逻辑
 */

import { parse } from 'acorn';
import type { Node, Program, Expression, CallExpression, MemberExpression, BinaryExpression } from 'acorn';

// ============================== 类型定义 ==============================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
}

export interface DataOperation {
  type: 'modifier' | 'setter' | 'method';
  target: string;        // 目标属性如 'hp', 'mAtk'
  operation: string;     // 操作类型如 'add', 'multiply', 'set'
  value: number | string; // 操作值
  originalCode: string;  // 原始代码片段
}

export interface TransformResult {
  success: boolean;
  transformedCode: string;
  dataOperations: DataOperation[];
  originalCode: string;
  error?: string;
}

export interface ExecutionContext {
  member: any;           // Member实例
  reactiveSystem: any;   // ReactiveSystem实例
  [key: string]: any;    // 其他上下文变量
}

// ============================== 核心处理器 ==============================

export class JSExpressionProcessor {
  
  // ==================== 校验器 ====================
  
  /**
   * 验证JS代码的安全性和正确性
   */
  validate(code: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityIssues: []
    };

    try {
      // 1. 语法解析检查
      const ast = parse(code, { 
        ecmaVersion: 5,  // Blockly生成ES5代码
        sourceType: 'script'
      });

      // 2. 安全性检查
      this.checkSecurity(ast, result);
      
      // 3. 语法正确性检查
      this.checkSyntax(ast, result);
      
      // 4. 沙盒兼容性检查
      this.checkSandboxCompatibility(ast, result);
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`语法解析错误: ${error.message}`);
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
      'eval', 'Function', 'setTimeout', 'setInterval',
      'require', 'import', 'process', 'global', 'window'
    ];

    this.walkAST(ast, (node: Node) => {
      if (node.type === 'Identifier') {
        const identifier = node as any;
        if (dangerousPatterns.includes(identifier.name)) {
          result.securityIssues.push(`检测到危险操作: ${identifier.name}`);
        }
      }
      
      if (node.type === 'CallExpression') {
        const call = node as CallExpression;
        if (call.callee.type === 'Identifier') {
          const callee = call.callee as any;
          if (dangerousPatterns.includes(callee.name)) {
            result.securityIssues.push(`检测到危险函数调用: ${callee.name}`);
          }
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
      if (node.type === 'ReturnStatement') {
        hasReturn = true;
      }
    });

    // 对于简单表达式，建议有返回值
    if (!hasReturn && ast.body.length === 1 && ast.body[0].type === 'ExpressionStatement') {
      result.warnings.push('建议添加return语句以返回计算结果');
    }
  }

  /**
   * 沙盒兼容性检查
   */
  private checkSandboxCompatibility(ast: Program, result: ValidationResult): void {
    // 检查是否使用了沙盒中不可用的功能
    this.walkAST(ast, (node: Node) => {
      if (node.type === 'ThisExpression') {
        result.warnings.push('在沙盒中this将被设为undefined');
      }
    });
  }

  // ==================== 转换器 ====================

  /**
   * 转换数据操作为ReactiveSystem调用
   */
  transform(code: string): TransformResult {
    try {
      const ast = parse(code, { 
        ecmaVersion: 5,
        sourceType: 'script'
      });

      const dataOperations: DataOperation[] = [];
      let transformedCode = code;

      // 识别数据操作模式
      this.identifyDataOperations(ast, dataOperations);
      
      // 转换代码
      transformedCode = this.transformDataOperations(code, dataOperations);

      return {
        success: true,
        transformedCode,
        dataOperations,
        originalCode: code
      };

    } catch (error) {
      return {
        success: false,
        transformedCode: '',
        dataOperations: [],
        originalCode: code,
        error: error.message
      };
    }
  }

  /**
   * 识别数据操作模式
   */
  private identifyDataOperations(ast: Program, operations: DataOperation[]): void {
    this.walkAST(ast, (node: Node) => {
      // 识别模式1: self.hp + 10% -> 修饰符添加
      if (this.isPercentageOperation(node)) {
        const operation = this.parsePercentageOperation(node);
        if (operation) operations.push(operation);
      }
      
      // 识别模式2: caster.mAtk * 1.5 -> 直接计算
      if (this.isCalculationOperation(node)) {
        const operation = this.parseCalculationOperation(node);
        if (operation) operations.push(operation);
      }
      
      // 识别模式3: target.takeDamage(100) -> 方法调用
      if (this.isMethodCall(node)) {
        const operation = this.parseMethodCall(node);
        if (operation) operations.push(operation);
      }
    });
  }

  /**
   * 检查是否为百分比操作 (如: hp + 10%)
   */
  private isPercentageOperation(node: Node): boolean {
    if (node.type !== 'BinaryExpression') return false;
    
    const binary = node as BinaryExpression;
    if (binary.operator !== '+' && binary.operator !== '-') return false;
    
    // 检查右操作数是否包含%
    return this.containsPercentage(binary.right);
  }

  /**
   * 检查表达式是否包含百分比
   */
  private containsPercentage(node: Expression): boolean {
    // 简化实现：检查字面量字符串是否包含%
    // 实际实现可能需要更复杂的AST分析
    const code = this.nodeToString(node);
    return code.includes('%');
  }

  /**
   * 解析百分比操作
   */
  private parsePercentageOperation(node: Node): DataOperation | null {
    const binary = node as BinaryExpression;
    
    // 提取目标属性名
    const target = this.extractAttributeName(binary.left);
    if (!target) return null;
    
    // 提取百分比值
    const percentValue = this.extractPercentageValue(binary.right);
    if (percentValue === null) return null;
    
    return {
      type: 'modifier',
      target,
      operation: binary.operator === '+' ? 'add' : 'subtract',
      value: percentValue,
      originalCode: this.nodeToString(node)
    };
  }

  /**
   * 检查是否为计算操作
   */
  private isCalculationOperation(node: Node): boolean {
    return node.type === 'BinaryExpression';
  }

  /**
   * 解析计算操作
   */
  private parseCalculationOperation(node: Node): DataOperation | null {
    // 对于一般的计算操作，保持原样
    // 这里可以根据需要添加特殊转换逻辑
    return null;
  }

  /**
   * 检查是否为方法调用
   */
  private isMethodCall(node: Node): boolean {
    return node.type === 'CallExpression';
  }

  /**
   * 解析方法调用
   */
  private parseMethodCall(node: Node): DataOperation | null {
    const call = node as CallExpression;
    
    if (call.callee.type === 'MemberExpression') {
      const member = call.callee as MemberExpression;
      const method = this.nodeToString(member.property);
      
      // 特殊处理一些已知的方法
      if (method === 'takeDamage' || method === 'heal') {
        return {
          type: 'method',
          target: method,
          operation: 'call',
          value: call.arguments.length > 0 ? this.nodeToString(call.arguments[0]) : '',
          originalCode: this.nodeToString(node)
        };
      }
    }
    
    return null;
  }

  /**
   * 转换数据操作代码
   */
  private transformDataOperations(code: string, operations: DataOperation[]): string {
    let transformedCode = code;
    
    // 为每个数据操作生成转换后的代码
    for (const op of operations) {
      if (op.type === 'modifier') {
        const replacement = this.generateModifierCode(op);
        transformedCode = transformedCode.replace(op.originalCode, replacement);
      }
    }
    
    return transformedCode;
  }

  /**
   * 生成修饰符操作代码
   */
  private generateModifierCode(op: DataOperation): string {
    // 生成ReactiveSystem的addModifier调用
    return `ctx.reactiveSystem.addModifier('${op.target}', 'percentage', ${op.value}, { id: 'temp', type: 'system', name: 'temp' })`;
  }

  // ==================== 工具方法 ====================

  /**
   * 遍历AST
   */
  private walkAST(node: Node, callback: (node: Node) => void): void {
    callback(node);
    
    for (const key in node) {
      const value = (node as any)[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (item && typeof item === 'object' && item.type) {
              this.walkAST(item, callback);
            }
          });
        } else if (value.type) {
          this.walkAST(value, callback);
        }
      }
    }
  }

  /**
   * 将AST节点转换为字符串
   */
  private nodeToString(node: Node): string {
    // 简化实现，实际可能需要更复杂的代码生成
    switch (node.type) {
      case 'Identifier':
        return (node as any).name;
      case 'Literal':
        return String((node as any).value);
      case 'MemberExpression':
        const member = node as MemberExpression;
        return `${this.nodeToString(member.object)}.${this.nodeToString(member.property)}`;
      default:
        return '[complex expression]';
    }
  }

  /**
   * 提取属性名
   */
  private extractAttributeName(node: Expression): string | null {
    if (node.type === 'MemberExpression') {
      const member = node as MemberExpression;
      return this.nodeToString(member.property);
    }
    return null;
  }

  /**
   * 提取百分比值
   */
  private extractPercentageValue(node: Expression): number | null {
    const code = this.nodeToString(node);
    const match = code.match(/(\d+(?:\.\d+)?)%/);
    return match ? parseFloat(match[1]) : null;
  }
}

// ============================== 导出 ==============================

export default JSExpressionProcessor;