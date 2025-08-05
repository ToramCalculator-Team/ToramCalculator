/**
 * Schema路径解析器
 * 
 * 核心功能：
 * 1. 将DSL路径（如 self.abi.str）转换为ReactiveSystem键名（如 abi.str）
 * 2. 从JS代码中提取所有属性访问
 * 3. 验证Schema路径的有效性
 * 
 * 设计理念：
 * - 桥接用户友好的DSL和高性能的存储结构
 * - 支持嵌套属性访问的自动转换
 * - 提供详细的路径验证和错误信息
 */

import type { NestedSchema, SchemaAttribute } from "../member/ReactiveSystem";

// ============================== 类型定义 ==============================

export interface SchemaPath {
  /** 原始DSL路径 (如: self.abi.str) */
  dslPath: string;
  /** ReactiveSystem中的键名 (如: abi.str) */
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
   * 解析DSL路径到ReactiveSystem键名
   * self.abi.str → "abi.str"
   * self.equip.weapon.main.attack.physical → "equip.weapon.main.attack.physical"
   */
  resolvePath(dslPath: string): string | null {
    // 移除 self/target 前缀
    const cleanPath = dslPath.replace(/^(self|target)\./, '');
    
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
    
    // 使用正则表达式匹配 self.xxx 和 target.xxx
    // 支持多层嵌套：self.abi.str, self.equip.weapon.main.attack.physical 等
    const pattern = /\b(self|target)\.([a-zA-Z_][a-zA-Z0-9_.]*)/g;
    let match;
    
    while ((match = pattern.exec(code)) !== null) {
      const [fullExpression, accessor, path] = match;
      const dslPath = `${accessor}.${path}`;
      const reactiveKey = this.resolvePath(dslPath);
      
      if (reactiveKey) {
        resolvedPaths.push({
          dslPath,
          reactiveKey,
          accessor: accessor as 'self' | 'target',
          fullExpression,
          startIndex: match.index,
          endIndex: match.index + fullExpression.length
        });
      } else {
        invalidPaths.push(dslPath);
        warnings.push(`无效的属性路径: ${dslPath} - 在Schema中未找到对应定义`);
      }
    }
    
    // 检查重复访问
    const seen = new Set<string>();
    resolvedPaths.forEach(path => {
      if (seen.has(path.fullExpression)) {
        warnings.push(`重复的属性访问: ${path.fullExpression}`);
      } else {
        seen.add(path.fullExpression);
      }
    });
    
    return {
      resolvedPaths,
      invalidPaths,
      warnings
    };
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
    let current: any = this.schema;
    
    for (const part of parts) {
      if (!current || typeof current !== 'object') return null;
      current = current[part];
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
    let current: any = this.schema;
    
    for (const part of parts) {
      if (!current || typeof current !== 'object') return false;
      current = current[part];
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