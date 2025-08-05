/**
 * 基于同构数组的高性能响应式系统
 *
 * 特性：
 * - TypedArray存储：使用Float64Array和Uint32Array提供最高性能
 * - 位标志优化：使用位运算管理属性状态
 * - 批量更新：支持一次性更新多个属性
 * - API兼容：保持与原ReactiveDataManager相同的接口
 * - 内存优化：连续内存布局，减少GC压力
 */

import JSExpressionIntegration from "../expression/JSExpressionIntegration";

// 数据存储逻辑类型
type DataStorage = {
  baseValue: {
    sourceId: number;
    value: number;
  };
  static: {
    fixed: {
      sourceId: number;
      value: number;
    };
    percentage: {
      sourceId: number;
      value: number;
    };
  };
  dynamic: {
    fixed: {
      sourceId: number;
      value: number;
    };
    percentage: {
      sourceId: number;
      value: number;
    };
  };
};

// ============================== Schema相关类型 ==============================

/**
 * Schema中单个属性的定义
 */
export interface SchemaAttribute {
  displayName: string;
  expression: string;
  isBase?: boolean;
}

/**
 * 嵌套Schema结构（任意深度）
 */
export type NestedSchema = {
  [key: string]: SchemaAttribute | NestedSchema;
};

/**
 * 扁平化后的Schema结果
 */
export interface FlattenedSchema<T extends string> {
  attrKeys: T[];
  expressions: Map<T, AttributeExpression<T>>;
  displayNames: Map<T, string>;
  dslMapping: Map<string, T>; // DSL路径 -> 扁平化键名的映射
}

// ============================== Schema工具类型 ==============================

/**
 * 从Schema生成属性键的联合类型
 * 递归遍历Schema，将路径转换为小驼峰格式作为键
 */

// 路径转小驼峰（CamelCase）表示
type JoinPath<T extends string[], Acc extends string = ""> = T extends [
  infer H extends string,
  ...infer R extends string[],
]
  ? JoinPath<R, `${Acc}${Capitalize<H>}`>
  : Uncapitalize<Acc>; // 让首字母小写 => camelCase

export type ExtractAttrPaths<T extends NestedSchema, Path extends string[] = []> = {
  [K in keyof T]: T[K] extends SchemaAttribute
    ? JoinPath<[...Path, K & string]>
    : T[K] extends NestedSchema
      ? ExtractAttrPaths<T[K], [...Path, K & string]>
      : never;
}[keyof T];

/**
 * 从Schema生成属性键的字符串联合类型
 */
export type SchemaToAttrType<T extends NestedSchema> = ExtractAttrPaths<T>;

/**
 * 从Schema生成完整的属性类型映射
 * 包含所有属性键和对应的number类型
 */
export type SchemaToAttrRecord<T extends NestedSchema> = Record<SchemaToAttrType<T>, number>;

// ============================== Schema工具函数 ==============================

/**
 * Schema扁平化工具类
 */
export class SchemaFlattener {
  /**
   * 扁平化嵌套的Schema结构
   */
  static flatten<T extends string>(schema: NestedSchema): FlattenedSchema<T> {
    const attrKeys: T[] = [];
    const expressions = new Map<T, AttributeExpression<T>>();
    const displayNames = new Map<T, string>();
    const dslMapping = new Map<string, T>();

    // 小驼峰命名法
    function camelCase(path: string): string {
      return path
        .replace(/_([a-z])/g, (_, g) => g.toUpperCase())
        .replace(/(?:^|\.)([a-z])/g, (_, g, i) => (i === 0 ? g : g.toUpperCase()));
    }

    function traverse(obj: NestedSchema, path: string[] = []): void {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        const dslPath = currentPath.join(".");

        if (SchemaFlattener.isSchemaAttribute(value)) {
          // 使用路径转换成小驼峰作为属性 key
          const attrKey = camelCase(currentPath.join("_")) as T;

          attrKeys.push(attrKey);

          expressions.set(attrKey, {
            expression: value.expression,
            isBase: value.isBase,
          });

          displayNames.set(attrKey, value.displayName);
          dslMapping.set(dslPath, attrKey);

          // console.log(`📋 扁平化属性: ${dslPath} -> ${attrKey} (${value.displayName})`);
        } else {
          traverse(value, currentPath);
        }
      }
    }

    console.log("schema", schema);
    traverse(schema);

    // console.log(`✅ Schema扁平化完成: ${attrKeys.length} 个属性`);
    // console.log(`🗺️ DSL映射条目: ${dslMapping.size} 个`);

    return {
      attrKeys,
      expressions,
      displayNames,
      dslMapping,
    };
  }

  /**
   * 检查对象是否为SchemaAttribute
   */
  private static isSchemaAttribute(obj: any): obj is SchemaAttribute {
    return obj && typeof obj === "object" && typeof obj.displayName === "string" && typeof obj.expression === "string";
  }
}

// ============================== 通用接口定义 ==============================

export interface ModifierSource {
  id: string;
  name: string;
  type: "equipment" | "skill" | "buff" | "debuff" | "passive" | "system";
}

export interface Modifier {
  value: number;
  source: ModifierSource;
}

export interface AttributeExpression<TAttr extends string> {
  expression: string;
  isBase?: boolean;
}

// ============================== 枚举和常量 ==============================

/**
 * 属性状态位标志
 * 使用位运算优化状态检查
 */
export enum AttributeFlags {
  IS_DIRTY = 1 << 0, // 0001: 需要重新计算
  HAS_COMPUTATION = 1 << 1, // 0010: 有计算函数
  IS_BASE = 1 << 2, // 0100: 基础属性
  IS_CACHED = 1 << 3, // 1000: 有缓存值
}

/**
 * 修饰符类型映射到数组索引
 */
export enum ModifierArrayIndex {
  BASE_VALUE = 0,
  STATIC_FIXED = 1,
  STATIC_PERCENTAGE = 2,
  DYNAMIC_FIXED = 3,
  DYNAMIC_PERCENTAGE = 4,
  MODIFIER_ARRAYS_COUNT = 5,
}

// ============================== 工具类 ==============================

/**
 * 位标志操作工具类
 */
export class BitFlags {
  /**
   * 设置标志位
   */
  static set(flags: Uint32Array, index: number, flag: AttributeFlags): void {
    const arrayIndex = index >>> 5; // index / 32
    const bitIndex = index & 31; // index % 32
    flags[arrayIndex] |= flag << bitIndex;
  }

  /**
   * 清除标志位
   */
  static clear(flags: Uint32Array, index: number, flag: AttributeFlags): void {
    const arrayIndex = index >>> 5;
    const bitIndex = index & 31;
    flags[arrayIndex] &= ~(flag << bitIndex);
  }

  /**
   * 检查标志位
   */
  static has(flags: Uint32Array, index: number, flag: AttributeFlags): boolean {
    const arrayIndex = index >>> 5;
    const bitIndex = index & 31;
    return (flags[arrayIndex] & (flag << bitIndex)) !== 0;
  }

  /**
   * 切换标志位
   */
  static toggle(flags: Uint32Array, index: number, flag: AttributeFlags): void {
    const arrayIndex = index >>> 5;
    const bitIndex = index & 31;
    flags[arrayIndex] ^= flag << bitIndex;
  }
}

/**
 * 依赖图管理（优化版本）
 */
export class DependencyGraph {
  private readonly dependencies: Set<number>[] = [];
  private readonly dependents: Set<number>[] = [];
  private sortedKeys: number[] = [];
  private isTopologySorted = false;

  constructor(private readonly maxSize: number) {
    // 预分配数组
    for (let i = 0; i < maxSize; i++) {
      this.dependencies[i] = new Set();
      this.dependents[i] = new Set();
    }
  }

  addDependency(dependent: number, dependency: number): void {
    if (dependent === dependency) return;

    this.dependencies[dependent].add(dependency);
    this.dependents[dependency].add(dependent);
    this.isTopologySorted = false;
  }

  removeDependency(dependent: number, dependency: number): void {
    this.dependencies[dependent].delete(dependency);
    this.dependents[dependency].delete(dependent);
    this.isTopologySorted = false;
  }

  getDependencies(attr: number): Set<number> {
    return this.dependencies[attr];
  }

  getDependents(attr: number): Set<number> {
    return this.dependents[attr];
  }

  getTopologicalOrder(): number[] {
    if (this.isTopologySorted) {
      return this.sortedKeys;
    }

    const visited = new Uint8Array(this.maxSize);
    const temp = new Uint8Array(this.maxSize);
    const order: number[] = [];

    const visit = (node: number) => {
      if (temp[node]) {
        throw new Error(`检测到循环依赖: ${node}`);
      }
      if (visited[node]) return;

      temp[node] = 1;
      for (const dep of this.dependencies[node]) {
        visit(dep);
      }
      temp[node] = 0;
      visited[node] = 1;
      order.push(node);
    };

    for (let i = 0; i < this.maxSize; i++) {
      if (!visited[i] && (this.dependencies[i].size > 0 || this.dependents[i].size > 0)) {
        visit(i);
      }
    }

    this.sortedKeys = order;
    this.isTopologySorted = true;
    return order;
  }

  getAffectedAttributes(changedAttr: number): Set<number> {
    const affected = new Set<number>();
    const queue: number[] = [changedAttr];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (affected.has(current)) continue;

      affected.add(current);
      for (const dependent of this.dependents[current]) {
        queue.push(dependent);
      }
    }

    return affected;
  }
}

// ============================== 主要实现 ==============================

/**
 * 基于TypedArray的高性能响应式数据管理器
 */
export class ReactiveSystem<T extends string> {
  // ==================== 核心数据结构 ====================

  /** 主要属性值存储 - 连续内存布局 */
  private readonly values: Float64Array;

  /** 属性状态标志位 */
  private readonly flags: Uint32Array;

  /** 修饰符数据存储 - 5个数组分别存储不同类型的修饰符 */
  private readonly modifierArrays: Float64Array[];

  /** 依赖图 */
  private readonly dependencyGraph: DependencyGraph;

  /** JS表达式处理器 */
  private readonly jsProcessor: JSExpressionIntegration;

  /** 脏属性队列 - 使用Uint32Array作为位图 */
  private readonly dirtyBitmap: Uint32Array;

  /** 计算函数存储 */
  private readonly computationFunctions: Map<number, (scope: Float64Array) => number>;

  /** 属性键映射 */
  private readonly keyToIndex: Map<T, number>;
  private readonly indexToKey: T[];

  /** DSL路径映射（用于DSL支持） */
  private readonly dslMapping: Map<string, T>;

  /** 显示名称映射（用于调试） */
  private readonly displayNames: Map<T, string>;

  // ==================== 性能统计 ====================

  private readonly stats = {
    computations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastUpdateTime: 0,
    batchUpdates: 0,
  };

  // ==================== 构造函数 ====================

  /**
   * 构造函数 - 使用统一的Schema模式
   *
   * @param schema 嵌套的Schema结构
   */
  constructor(schema: NestedSchema) {
    console.log("🔧 使用Schema模式初始化ReactiveSystem");

    // 扁平化Schema
    const flattened = SchemaFlattener.flatten<T>(schema);
    const attrKeys = flattened.attrKeys;
    const expressions = flattened.expressions;
    const displayNames = flattened.displayNames;
    const dslMapping = flattened.dslMapping;
    const keyCount = attrKeys.length;

    // 初始化核心数据结构
    this.values = new Float64Array(keyCount);
    this.flags = new Uint32Array(Math.ceil(keyCount / 32));
    this.dirtyBitmap = new Uint32Array(Math.ceil(keyCount / 32));

    // 初始化修饰符数组
    this.modifierArrays = [];
    for (let i = 0; i < ModifierArrayIndex.MODIFIER_ARRAYS_COUNT; i++) {
      this.modifierArrays[i] = new Float64Array(keyCount);
    }

    // 初始化映射关系
    this.keyToIndex = new Map();
    this.indexToKey = attrKeys;
    this.dslMapping = dslMapping;
    this.displayNames = displayNames;

    attrKeys.forEach((key, index) => {
      this.keyToIndex.set(key, index);
    });

    // 初始化依赖图和JS表达式处理器
    this.dependencyGraph = new DependencyGraph(keyCount);
    this.jsProcessor = new JSExpressionIntegration({
      enableTransformation: false, // 在ReactiveSystem中不需要数据操作转换
      enableValidation: true,
      strictMode: false,
    });
    this.computationFunctions = new Map();

    console.log(`🚀 ReactiveSystem 初始化完成，属性数量: ${keyCount}`);
    console.log(`🗺️ DSL映射支持: ${dslMapping.size} 个路径`);

    // 设置表达式
    if (expressions.size > 0) {
      this.setupExpressions(expressions);
    }

    // 标记所有属性为脏值
    this.markAllDirty();
  }

  // ==================== DSL支持API ====================

  /**
   * 通过DSL路径获取属性值
   *
   * @param dslPath DSL路径，如 "abi.str", "hp.max"
   * @returns 属性值，如果路径不存在返回0
   */
  getValueByDSL(dslPath: string): number {
    const attrKey = this.dslMapping.get(dslPath);
    if (!attrKey) {
      console.warn(`⚠️ DSL路径不存在: ${dslPath}`);
      return 0;
    }
    return this.getValue(attrKey);
  }

  /**
   * 通过DSL路径设置属性值
   *
   * @param dslPath DSL路径，如 "abi.str", "hp.current"
   * @param value 要设置的值
   */
  setValueByDSL(dslPath: string, value: number): void {
    const attrKey = this.dslMapping.get(dslPath);
    if (!attrKey) {
      console.warn(`⚠️ DSL路径不存在: ${dslPath}`);
      return;
    }
    this.setValue(attrKey, value);
  }

  /**
   * 获取属性的显示名称
   */
  getDisplayName(attr: T): string {
    return this.displayNames.get(attr) || attr;
  }

  /**
   * 获取所有DSL路径映射
   */
  getDSLMapping(): Map<string, T> {
    return new Map(this.dslMapping);
  }

  /**
   * 检查DSL路径是否存在
   */
  hasDSLPath(dslPath: string): boolean {
    return this.dslMapping.has(dslPath);
  }

  // ==================== 核心API（保持兼容） ====================

  /**
   * 获取属性值
   */
  getValue(attr: T): number {
    const index = this.keyToIndex.get(attr);
    if (index === undefined) {
      console.warn(`⚠️ 尝试获取不存在的属性值: ${attr}`);
      return 0;
    }

    // 检查是否需要更新
    if (this.isDirty(index)) {
      this.updateDirtyValues();
    }

    // 检查是否有缓存值
    if (BitFlags.has(this.flags, index, AttributeFlags.IS_CACHED)) {
      this.stats.cacheHits++;
      return this.values[index];
    }

    // 重新计算
    this.stats.cacheMisses++;
    const value = this.computeAttributeValue(index);
    this.values[index] = value;
    BitFlags.set(this.flags, index, AttributeFlags.IS_CACHED);
    BitFlags.clear(this.flags, index, AttributeFlags.IS_DIRTY);

    return value;
  }

  /**
   * 设置属性值
   */
  setValue(attr: T, value: number): void {
    const index = this.keyToIndex.get(attr);
    if (index === undefined) {
      console.warn(`⚠️ 尝试设置不存在的属性值: ${attr}`);
      return;
    }

    // 设置基础值
    this.modifierArrays[ModifierArrayIndex.BASE_VALUE][index] = value;
    this.markDirty(index);
  }

  /**
   * 批量获取属性值
   */
  getValues(attrs?: T[]): Record<T, number> {
    const targetAttrs = attrs || this.indexToKey;
    const result: Record<T, number> = {} as Record<T, number>;

    // 只在有脏值时才批量更新
    if (this.hasDirtyValues()) {
      this.updateDirtyValues();
    }

    // 批量读取（不计入缓存统计，因为这是直接数组访问）
    for (const attr of targetAttrs) {
      const index = this.keyToIndex.get(attr);
      if (index !== undefined) {
        result[attr] = this.values[index];
      }
    }

    return result;
  }

  /**
   * 批量设置基础值
   */
  setBaseValues(values: Record<T, number>): void {
    console.log(`🔧 设置基础值: ${JSON.stringify(values)}`);
    const baseArray = this.modifierArrays[ModifierArrayIndex.BASE_VALUE];

    for (const [attr, value] of Object.entries(values)) {
      const index = this.keyToIndex.get(attr as T);
      if (index !== undefined && typeof value === "number") {
        baseArray[index] = value;
        this.markDirty(index);
      }
    }

    this.stats.batchUpdates++;
  }

  /**
   * 添加修饰符
   */
  addModifier(
    attr: T,
    type: "staticFixed" | "staticPercentage" | "dynamicFixed" | "dynamicPercentage",
    value: number,
    source: ModifierSource,
  ): void {
    const index = this.keyToIndex.get(attr);
    if (index === undefined) {
      console.warn(`⚠️ 尝试为不存在的属性添加修饰器: ${attr}`);
      return;
    }

    // 映射修饰符类型到数组索引
    let arrayIndex: ModifierArrayIndex;
    switch (type) {
      case "staticFixed":
        arrayIndex = ModifierArrayIndex.STATIC_FIXED;
        break;
      case "staticPercentage":
        arrayIndex = ModifierArrayIndex.STATIC_PERCENTAGE;
        break;
      case "dynamicFixed":
        arrayIndex = ModifierArrayIndex.DYNAMIC_FIXED;
        break;
      case "dynamicPercentage":
        arrayIndex = ModifierArrayIndex.DYNAMIC_PERCENTAGE;
        break;
      default:
        console.warn(`⚠️ 未知的修饰符类型: ${type}`);
        return;
    }

    // 累加修饰符值
    this.modifierArrays[arrayIndex][index] += value;
    this.markDirty(index);

    console.log(`✅ 成功添加修饰器: ${attr} ${type} +${value} (来源: ${source.name})`);
  }

  // ==================== 内部实现 ====================

  /**
   * 设置表达式和依赖关系
   */
  private setupExpressions(expressions: Map<T, AttributeExpression<T>>): void {
    console.log("🔧 设置表达式和依赖关系...");

    for (const [attrName, expressionData] of expressions) {
      const index = this.keyToIndex.get(attrName);
      if (index === undefined || expressionData.isBase || !expressionData.expression) {
        continue;
      }

      // console.log(`📐 设置属性 ${attrName} 的表达式: ${expressionData.expression}`);

      // 设置计算函数，使用新的JS表达式解析器
      this.computationFunctions.set(index, (scope: Float64Array) => {
        // 创建执行上下文，将scope中的值映射到属性名
        const context: any = {};

        // 将scope数组中的值映射到对应的属性名
        this.indexToKey.forEach((key, idx) => {
          context[key] = scope[idx];
        });

        // 调试：打印关键属性的映射
        console.log(`🔍 属性映射调试 - 表达式: ${expressionData.expression}`);
        console.log(`🔍 关键属性值:`, {
          lv: context.lv,
          vit: context.vit,
          str: context.str,
          int: context.int,
          agi: context.agi,
          dex: context.dex,
          cri: context.cri,
          tec: context.tec,
        });

        // 添加自定义函数
        context.dynamicTotalValue = (attrName: string) => {
          const attrIndex = this.keyToIndex.get(attrName as T);
          return attrIndex !== undefined ? scope[attrIndex] : 0;
        };

        // 直接执行表达式，不需要return包装
        // JSExpressionIntegration会在内部处理函数包装
        const result = this.jsProcessor.processAndExecute(expressionData.expression, context);

        if (result.success) {
          const value = typeof result.value === "number" ? result.value : 0;
          // console.log(`✅ 表达式计算成功: ${expressionData.expression} = ${value}`);
          return value;
        } else {
          console.error(`❌ 属性 ${attrName} 表达式计算失败: ${expressionData.expression}`, result.error);
          console.error(`❌ 上下文内容:`, Object.keys(context));
          return 0;
        }
      });

      BitFlags.set(this.flags, index, AttributeFlags.HAS_COMPUTATION);

      // 解析依赖关系（简化版本，待完善）
      this.parseDependencies(index, expressionData.expression);
    }

    console.log("✅ 表达式和依赖关系设置完成");
  }

  /**
   * 解析表达式依赖关系
   */
  private parseDependencies(attrIndex: number, expression: string): void {
    try {
      // 使用JS表达式处理器分析依赖关系
      const processor = new JSExpressionIntegration({
        enableTransformation: false,
        enableValidation: true,
        strictMode: false,
      });

      // 验证表达式并获取AST信息
      const validation = processor.validateOnly(expression);

      if (validation.isValid) {
        // 简化的依赖解析：检查表达式中是否包含其他属性名
        for (const [key, dependencyIndex] of this.keyToIndex) {
          if (expression.includes(key) && dependencyIndex !== attrIndex) {
            this.dependencyGraph.addDependency(attrIndex, dependencyIndex);
            console.log(`🔗 发现依赖关系: ${this.indexToKey[attrIndex]} 依赖于 ${key}`);
          }
        }
      } else {
        console.warn(`⚠️ 表达式依赖解析失败: ${expression}`, validation.errors);
        // 回退到简单的字符串匹配
        for (const [key, dependencyIndex] of this.keyToIndex) {
          if (expression.includes(key) && dependencyIndex !== attrIndex) {
            this.dependencyGraph.addDependency(attrIndex, dependencyIndex);
          }
        }
      }
    } catch (error) {
      console.error(`❌ 依赖关系解析异常: ${expression}`, error);
      // 回退到简单的字符串匹配
      for (const [key, dependencyIndex] of this.keyToIndex) {
        if (expression.includes(key) && dependencyIndex !== attrIndex) {
          this.dependencyGraph.addDependency(attrIndex, dependencyIndex);
        }
      }
    }
  }

  /**
   * 计算单个属性值
   */
  private computeAttributeValue(index: number): number {
    this.stats.computations++;

    // 如果有计算函数，使用它
    const computationFn = this.computationFunctions.get(index);
    if (computationFn) {
      return computationFn(this.values);
    }

    // 否则使用标准计算
    const base = this.modifierArrays[ModifierArrayIndex.BASE_VALUE][index];
    const staticFixed = this.modifierArrays[ModifierArrayIndex.STATIC_FIXED][index];
    const staticPercentage = this.modifierArrays[ModifierArrayIndex.STATIC_PERCENTAGE][index];
    const dynamicFixed = this.modifierArrays[ModifierArrayIndex.DYNAMIC_FIXED][index];
    const dynamicPercentage = this.modifierArrays[ModifierArrayIndex.DYNAMIC_PERCENTAGE][index];

    const totalPercentage = staticPercentage + dynamicPercentage;
    const totalFixed = staticFixed + dynamicFixed;

    return Math.floor(base * (1 + totalPercentage / 100) + totalFixed);
  }

  /**
   * 批量更新脏值（优化版本）
   */
  private updateDirtyValues(): void {
    const startTime = performance.now();
    let updatedCount = 0;

    // 获取拓扑排序
    const order = this.dependencyGraph.getTopologicalOrder();

    // 按依赖顺序计算
    for (const index of order) {
      if (this.isDirty(index)) {
        const value = this.computeAttributeValue(index);
        this.values[index] = value;
        BitFlags.set(this.flags, index, AttributeFlags.IS_CACHED);
        this.clearDirty(index);
        updatedCount++;
      }
    }

    // 处理没有依赖关系的属性
    for (let i = 0; i < this.values.length; i++) {
      if (this.isDirty(i)) {
        const value = this.computeAttributeValue(i);
        this.values[i] = value;
        BitFlags.set(this.flags, i, AttributeFlags.IS_CACHED);
        this.clearDirty(i);
        updatedCount++;
      }
    }

    this.stats.lastUpdateTime = performance.now() - startTime;
    this.stats.computations += updatedCount;

    // 只在有实际更新时才输出日志
    if (updatedCount > 0) {
      console.log(`🔄 批量更新完成: ${updatedCount}个属性, 用时: ${this.stats.lastUpdateTime.toFixed(2)}ms`);
    }
  }

  /**
   * 标记属性为脏值（带依赖传播）
   */
  private markDirty(index: number): void {
    // 避免重复标记
    if (this.isDirty(index)) {
      return;
    }

    const attrName = this.indexToKey[index];
    console.log(`📍 标记属性为脏值: ${attrName} (index: ${index})`);

    const arrayIndex = index >>> 5; // index / 32
    const bitIndex = index & 31; // index % 32
    this.dirtyBitmap[arrayIndex] |= 1 << bitIndex;

    BitFlags.set(this.flags, index, AttributeFlags.IS_DIRTY);
    BitFlags.clear(this.flags, index, AttributeFlags.IS_CACHED);

    // 标记所有依赖此属性的属性为脏值
    const dependents = this.dependencyGraph.getDependents(index);
    console.log(
      `🔗 ${attrName} 的依赖者: [${Array.from(dependents)
        .map((dep) => this.indexToKey[dep])
        .join(", ")}]`,
    );

    for (const dependent of dependents) {
      console.log(`  -> 传播脏状态到: ${this.indexToKey[dependent]} (index: ${dependent})`);
      this.markDirty(dependent);
    }
  }

  /**
   * 清除脏值标记
   */
  private clearDirty(index: number): void {
    const arrayIndex = index >>> 5;
    const bitIndex = index & 31;
    this.dirtyBitmap[arrayIndex] &= ~(1 << bitIndex);
    BitFlags.clear(this.flags, index, AttributeFlags.IS_DIRTY);
  }

  /**
   * 检查是否为脏值
   */
  private isDirty(index: number): boolean {
    const arrayIndex = index >>> 5;
    const bitIndex = index & 31;
    return (this.dirtyBitmap[arrayIndex] & (1 << bitIndex)) !== 0;
  }

  /**
   * 检查是否有脏值需要更新
   */
  private hasDirtyValues(): boolean {
    // 检查 dirtyBitmap 是否有任何位被设置
    for (let i = 0; i < this.dirtyBitmap.length; i++) {
      if (this.dirtyBitmap[i] !== 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * 标记所有属性为脏值
   */
  private markAllDirty(): void {
    this.dirtyBitmap.fill(0xffffffff); // 设置所有位为1
    for (let i = 0; i < this.values.length; i++) {
      BitFlags.set(this.flags, i, AttributeFlags.IS_DIRTY);
    }
  }

  // ==================== 调试和统计 ====================

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      totalAttributes: this.values.length,
      memoryUsage: {
        values: this.values.byteLength,
        flags: this.flags.byteLength,
        modifiers: this.modifierArrays.reduce((sum, arr) => sum + arr.byteLength, 0),
        total:
          this.values.byteLength +
          this.flags.byteLength +
          this.modifierArrays.reduce((sum, arr) => sum + arr.byteLength, 0),
      },
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.computations = 0;
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
    this.stats.lastUpdateTime = 0;
    this.stats.batchUpdates = 0;
  }

  /**
   * 设置单个基础值（兼容原API）
   */
  setBaseValue(attr: T, value: number | { value: number; source: ModifierSource }): void {
    const index = this.keyToIndex.get(attr);
    if (index === undefined) {
      console.warn(`⚠️ 尝试设置不存在的属性值: ${attr}`);
      return;
    }

    const numericValue = typeof value === "number" ? value : value.value;
    this.modifierArrays[ModifierArrayIndex.BASE_VALUE][index] = numericValue;
    this.markDirty(index);
  }

  /**
   * 从角色数据解析修饰符（兼容原API）
   */
  parseModifiersFromCharacter(member: any, sourceName: string): void {
    console.log(`🔄 从角色数据解析修饰符: ${sourceName}`);

    function findAllModifiersWithPath(obj: any, path: string[] = []): void {
      if (typeof obj !== "object" || obj === null) return;

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];

        if (key === "modifiers" && Array.isArray(value) && value.every((v) => typeof v === "string")) {
          const fullPath = currentPath.join(".");
          console.log(`📌 从${sourceName}中找到修饰符: ${fullPath}`);
          for (const mod of value) {
            console.log(` - ${mod}`);
          }
        } else if (typeof value === "object") {
          findAllModifiersWithPath(value, currentPath);
        }
      }
    }

    findAllModifiersWithPath(member);

    // 示例：可以根据角色数据添加各种修饰符
    // this.addModifier("str", "staticFixed", character.equipmentBonus?.str || 0, source);
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): Record<string, any> {
    const result: Record<string, any> = {};

    for (let i = 0; i < this.indexToKey.length; i++) {
      const key = this.indexToKey[i];
      result[key] = {
        value: this.values[i],
        isDirty: this.isDirty(i),
        isCached: BitFlags.has(this.flags, i, AttributeFlags.IS_CACHED),
        hasComputation: BitFlags.has(this.flags, i, AttributeFlags.HAS_COMPUTATION),
        dependencies: Array.from(this.dependencyGraph.getDependencies(i)).map((idx) => this.indexToKey[idx]),
        dependents: Array.from(this.dependencyGraph.getDependents(i)).map((idx) => this.indexToKey[idx]),
        modifiers: {
          base: this.modifierArrays[ModifierArrayIndex.BASE_VALUE][i],
          staticFixed: this.modifierArrays[ModifierArrayIndex.STATIC_FIXED][i],
          staticPercentage: this.modifierArrays[ModifierArrayIndex.STATIC_PERCENTAGE][i],
          dynamicFixed: this.modifierArrays[ModifierArrayIndex.DYNAMIC_FIXED][i],
          dynamicPercentage: this.modifierArrays[ModifierArrayIndex.DYNAMIC_PERCENTAGE][i],
        },
      };
    }

    return result;
  }

  /**
   * 获取依赖图信息（用于调试）
   */
  getDependencyGraphInfo(): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (let i = 0; i < this.indexToKey.length; i++) {
      const key = this.indexToKey[i];
      const dependents = Array.from(this.dependencyGraph.getDependents(i));
      if (dependents.length > 0) {
        result[key] = dependents.map((idx) => this.indexToKey[idx]);
      }
    }

    return result;
  }

  /**
   * 输出响应式系统的依赖关系图
   * 用于调试和理解属性之间的依赖关系
   *
   * @param memberName 成员名称
   * @param memberType 成员类型
   */
  outputDependencyGraph(memberName: string, memberType: string): void {
    console.log(`\n📊 === ${memberType} 响应式系统依赖关系图 ===`);
    console.log(`🏷️  成员: ${memberName} (${memberType})`);
    console.log(`📦 属性总数: ${this.indexToKey.length}`);

    // 分类属性
    const baseAttrs: string[] = [];
    const computedAttrs: string[] = [];
    const dependencyMap = new Map<string, string[]>();

    for (let i = 0; i < this.indexToKey.length; i++) {
      const attrKey = this.indexToKey[i];
      const isBase = BitFlags.has(this.flags, i, AttributeFlags.IS_BASE);

      if (isBase) {
        baseAttrs.push(attrKey);
      } else {
        computedAttrs.push(attrKey);
        // 获取该属性的依赖关系
        const dependencies = Array.from(this.dependencyGraph.getDependencies(i));
        const depNames = dependencies.map((depIndex) => this.indexToKey[depIndex]);
        dependencyMap.set(attrKey, depNames);
      }
    }

    // 获取当前所有属性值
    const currentValues = this.getValues(this.indexToKey as T[]);

    // 输出基础属性
    console.log(`\n🔹 基础属性 (${baseAttrs.length}):`);
    baseAttrs.sort().forEach((attr) => {
      const value = currentValues[attr as T];
      console.log(`  📌 ${attr}: ${value}`);
    });

    // 输出计算属性及其依赖
    console.log(`\n🔸 计算属性 (${computedAttrs.length}):`);
    computedAttrs.sort().forEach((attr) => {
      const value = currentValues[attr as T];
      const deps = dependencyMap.get(attr) || [];

      console.log(`  🧮 ${attr}: ${value}`);
      if (deps.length > 0) {
        console.log(`     🔗 依赖: ${deps.join(", ")}`);
      }
      console.log("");
    });

    // 输出依赖关系统计
    const totalDeps = Array.from(dependencyMap.values()).reduce((sum, deps) => sum + deps.length, 0);
    const avgComplexity = computedAttrs.length > 0 ? totalDeps / computedAttrs.length : 0;

    console.log(`📈 依赖关系统计:`);
    console.log(`   • 基础属性: ${baseAttrs.length}`);
    console.log(`   • 计算属性: ${computedAttrs.length}`);
    console.log(`   • 依赖关系: ${totalDeps}`);
    console.log(`   • 复杂度: ${avgComplexity.toFixed(2)} (平均每个计算属性的依赖数)`);

    // 如果有循环依赖，输出警告
    const hasCycles = this.detectCycles();
    if (hasCycles.length > 0) {
      console.log(`\n⚠️  检测到循环依赖:`);
      hasCycles.forEach((cycle, index) => {
        const cycleNames = cycle.map((idx) => this.indexToKey[idx]);
        console.log(`   ${index + 1}. ${cycleNames.join(" → ")} → ${cycleNames[0]}`);
      });
    }

    console.log(`\n🎯 === 依赖关系图输出完成 ===\n`);
  }

  /**
   * 检测循环依赖
   *
   * @returns 循环依赖的数组，每个循环依赖是一个属性索引数组
   */
  private detectCycles(): number[][] {
    const cycles: number[][] = [];
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    const path: number[] = [];

    const dfs = (nodeIndex: number): boolean => {
      if (recursionStack.has(nodeIndex)) {
        // 找到循环，提取循环路径
        const cycleStart = path.indexOf(nodeIndex);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return true;
      }

      if (visited.has(nodeIndex)) {
        return false;
      }

      visited.add(nodeIndex);
      recursionStack.add(nodeIndex);
      path.push(nodeIndex);

      // 遍历所有依赖
      const dependencies = this.dependencyGraph.getDependencies(nodeIndex);
      for (const dep of dependencies) {
        if (dfs(dep)) {
          return true;
        }
      }

      recursionStack.delete(nodeIndex);
      path.pop();
      return false;
    };

    for (let i = 0; i < this.indexToKey.length; i++) {
      if (!visited.has(i)) {
        dfs(i);
      }
    }

    return cycles;
  }
}
