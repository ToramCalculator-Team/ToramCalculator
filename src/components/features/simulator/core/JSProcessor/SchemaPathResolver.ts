/**
 * Schema路径解析器
 * 
 * 核心功能：
 * 1. 将DSL路径（如 self.abi.str）转换为StatContainer键名（如 abi.str）
 * 2. 从JS代码中提取所有属性访问
 * 3. 验证Schema路径的有效性
 * 
 * 设计理念：
 * - 桥接用户友好的DSL和高性能的存储结构
 * - 支持嵌套属性访问的自动转换
 * - 提供详细的路径验证和错误信息
 */

import type { NestedSchema, SchemaAttribute } from "../Member/runtime/StatContainer/SchemaTypes";

// ============================== 类型定义 ==============================

export interface SchemaPath {
  /** 原始DSL路径 (如: self.abi.str) */
  dslPath: string;
  /** StatContainer中的键名 (如: abi.str) */
  reactiveKey: string;
  /** 访问者类型 (self/target) */
  accessor: 'self' | 'target';
  /** 完整的原始表达式 */
  fullExpression: string;
  /** 在代码中的起始位置 */
  startIndex: number;
  /** 在代码中的结束位置 */
  endIndex: number;
}

export interface PathResolutionResult {
  /** 解析成功的路径 */
  resolvedPaths: SchemaPath[];
  /** 解析失败的路径 */
  invalidPaths: string[];
  /** 警告信息 */
  warnings: string[];
}

// ============================== Schema路径解析器 ==============================

export class SchemaPathResolver {
  
  constructor(private schema: NestedSchema) {}
  
  /**
   * 解析DSL路径到StatContainer键名
   * self.abi.str → "abi.str"
   * self.equip.weapon.main.attack.physical → "equip.weapon.main.attack.physical"
   * self.statContainer.getValue("lv") → "lv" (从方法调用中提取属性路径)
   * target.statContainer.addModifier("hp.current", ...) → "hp.current" (从方法调用中提取属性路径)
   */
  resolvePath(dslPath: string): string | null {
    // 1. 检查是否为方法调用格式：self.xxx.yyy("zzz") 或 target.xxx.yyy("zzz")
    // 匹配所有方法调用，第一个参数是字符串（通常是属性路径）
    console.log("🔧 resolvePath: ", dslPath);
    const methodCallMatch = dslPath.match(/^(self|target)\.[a-zA-Z_][a-zA-Z0-9_.]*\s*\(\s*["']([^"']+)["']/);
    if (methodCallMatch) {
      console.log("🔧 methodCallMatch: ", methodCallMatch);
      // 从方法调用中提取第一个字符串参数（通常是属性路径）
      const propertyPath = methodCallMatch[2]; // 例如 "lv", "hp.current"
      
      // 验证提取的属性路径是否在Schema中存在
      if (this.pathExistsInSchema(propertyPath)) {
        return propertyPath;
      }
      
      return null;
    }
    
    // 2. 处理传统的属性访问格式：self.xxx
    const cleanPath = dslPath.replace(/^(self|target)\./, '');
    console.log("🔧 cleanPath: ", cleanPath);
    
    // 在Schema中验证路径是否存在
    if (this.pathExistsInSchema(cleanPath)) {
      return cleanPath;
    }
    
    return null;
  }
  
  /**
   * 从JS代码中提取所有属性访问
   */
    extractPropertyAccesses(code: string): PathResolutionResult {
    const resolvedPaths: SchemaPath[] = [];
    const invalidPaths: string[] = [];
    const warnings: string[] = [];
    
    // 按行处理，避免跨行匹配问题
    const lines = code.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineOffset = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
      
      // 查找 self.xxx 和 target.xxx
      this.processLine(line, 'self', lineOffset, resolvedPaths, invalidPaths, warnings);
      this.processLine(line, 'target', lineOffset, resolvedPaths, invalidPaths, warnings);
    }
    
    return { resolvedPaths, invalidPaths, warnings };
  }
  
  /**
   * 处理单行代码
   */
  private processLine(
    line: string, 
    accessor: 'self' | 'target', 
    lineOffset: number,
    resolvedPaths: SchemaPath[],
    invalidPaths: string[],
    warnings: string[]
  ): void {
    const pattern = new RegExp(`\\b${accessor}\\.([a-zA-Z_][a-zA-Z0-9_.]*?)(?=\\s*[+\\-*/%^&|<>!=,;)\\]\\]]|\\s|$)`, 'g');
    
    const match = pattern.exec(line);
    while (match !== null) {
      const [fullExpression, path] = match;
      const startIndex = lineOffset + match.index;
      
      // 检查是否为方法调用
      if (line.substring(match.index).includes('(')) {
        // 提取方法调用的第一个字符串参数
        const methodCall = this.extractMethodCall(line, match.index);
        if (methodCall?.firstArg) {
          const dslPath = `${accessor}.${methodCall.firstArg}`;
          const reactiveKey = this.resolvePath(dslPath);
          
          if (reactiveKey) {
            resolvedPaths.push({
              dslPath,
              reactiveKey,
              accessor,
              fullExpression: methodCall.fullCall,
              startIndex,
              endIndex: startIndex + methodCall.fullCall.length
            });
          }
        }
      } else {
        // 普通属性访问
        const dslPath = `${accessor}.${path}`;
        const reactiveKey = this.resolvePath(dslPath);
        
        if (reactiveKey) {
          resolvedPaths.push({
            dslPath,
            reactiveKey,
            accessor,
            fullExpression,
            startIndex,
            endIndex: startIndex + fullExpression.length
          });
        } else {
          invalidPaths.push(dslPath);
          warnings.push(`无效的属性路径: ${dslPath} - 在Schema中未找到对应定义`);
        }
      }
    }
  }
  
  /**
   * 提取方法调用
   */
  private extractMethodCall(line: string, index: number): { fullCall: string; firstArg: string | null } | null {
    const afterMatch = line.substring(index);
    const openParenIndex = afterMatch.indexOf('(');
    if (openParenIndex === -1) return null;
    
    // 找到匹配的右括号
    let bracketCount = 0;
    let inString = false;
    let stringChar = '';
    let endIndex = openParenIndex + 1;
    
    for (let i = openParenIndex + 1; i < afterMatch.length; i++) {
      const char = afterMatch[i];
      
      if (!inString && char === '(') {
        bracketCount++;
      } else if (!inString && char === ')') {
        if (bracketCount === 0) {
          endIndex = i + 1;
          break;
        }
        bracketCount--;
      } else if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false;
      }
    }
    
    const fullCall = afterMatch.substring(0, endIndex);
    
    // 提取第一个字符串参数
    const firstArgMatch = fullCall.match(/\(["']([^"']+)["']/);
    const firstArg = firstArgMatch ? firstArgMatch[1] : null;
    
    return { fullCall, firstArg };
  }
  
  /**
   * 验证单个DSL路径是否有效
   */
  validatePath(dslPath: string): { isValid: boolean; error?: string } {
    if (!dslPath.match(/^(self|target)\./)) {
      return {
        isValid: false,
        error: `路径必须以 'self.' 或 'target.' 开头: ${dslPath}`
      };
    }
    
    const reactiveKey = this.resolvePath(dslPath);
    if (!reactiveKey) {
      return {
        isValid: false,
        error: `路径在Schema中不存在: ${dslPath}`
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * 获取Schema中所有可用的路径
   * 用于调试和错误提示
   */
  getAllAvailablePaths(): string[] {
    const paths: string[] = [];
    this.traverseSchema(this.schema, [], paths);
    return paths.sort();
  }
  
  /**
   * 获取路径的显示名称
   */
  getPathDisplayName(reactiveKey: string): string | null {
    const parts = reactiveKey.split('.');
    let current: NestedSchema = this.schema;
    
    for (const part of parts) {
      if (!current || typeof current !== 'object') return null;
      current = current[part] as NestedSchema;
    }
    
    if (this.isSchemaAttribute(current)) {
      return current.displayName;
    }
    
    return null;
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 检查路径是否在Schema中存在
   */
  private pathExistsInSchema(path: string): boolean {
    const parts = path.split('.');
    let current: NestedSchema = this.schema;
    
    for (const part of parts) {
      if (!current || typeof current !== 'object') return false;
      current = current[part] as NestedSchema;
    }
    
    return this.isSchemaAttribute(current);
  }
  
  /**
   * 检查对象是否为SchemaAttribute
   */
  private isSchemaAttribute(obj: any): obj is SchemaAttribute {
    return obj && 
           typeof obj === 'object' && 
           typeof obj.displayName === 'string' && 
           typeof obj.expression === 'string';
  }
  
  /**
   * 递归遍历Schema以获取所有路径
   */
  private traverseSchema(obj: NestedSchema, currentPath: string[], allPaths: string[]): void {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = [...currentPath, key];
      
      if (this.isSchemaAttribute(value)) {
        allPaths.push(newPath.join('.'));
      } else if (typeof value === 'object' && value !== null) {
        this.traverseSchema(value, newPath, allPaths);
      }
    }
  }
}

// ============================== 辅助函数 ==============================

/**
 * 转义正则表达式特殊字符
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 检查两个路径是否有重叠
 * 用于避免替换冲突
 */
export function pathsOverlap(path1: SchemaPath, path2: SchemaPath): boolean {
  return !(path1.endIndex <= path2.startIndex || path2.endIndex <= path1.startIndex);
}