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

import { create, all } from "mathjs";

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

// 创建 math 实例
const math = create(all);

// ============================== 枚举和常量 ==============================

/**
 * 属性状态位标志
 * 使用位运算优化状态检查
 */
export enum AttributeFlags {
  IS_DIRTY = 1 << 0,           // 0001: 需要重新计算
  HAS_COMPUTATION = 1 << 1,    // 0010: 有计算函数
  IS_BASE = 1 << 2,           // 0100: 基础属性
  IS_CACHED = 1 << 3,         // 1000: 有缓存值
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
    const bitIndex = index & 31;    // index % 32
    flags[arrayIndex] |= (flag << bitIndex);
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
    flags[arrayIndex] ^= (flag << bitIndex);
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

/**
 * 高性能数学作用域
 */
export class MathScope {
  private readonly mathInstance: any;
  private readonly scopeArray: Float64Array;
  private readonly keyToIndex: Map<string, number>;

  constructor(keys: string[]) {
    this.mathInstance = math.create(all);
    this.scopeArray = new Float64Array(keys.length);
    this.keyToIndex = new Map();
    
    keys.forEach((key, index) => {
      this.keyToIndex.set(key, index);
    });

    this.registerBuiltinFunctions();
  }

  private registerBuiltinFunctions(): void {
    // 注册自定义函数
    this.mathInstance.import({
      dynamicTotalValue: (attrName: string) => {
        const index = this.keyToIndex.get(attrName);
        return index !== undefined ? this.scopeArray[index] : 0;
      }
    });
  }

  setVariable(name: string, value: number): void {
    const index = this.keyToIndex.get(name);
    if (index !== undefined) {
      this.scopeArray[index] = value;
    }
  }

  getVariable(name: string): number {
    const index = this.keyToIndex.get(name);
    return index !== undefined ? this.scopeArray[index] : 0;
  }

  evaluate(expression: string): number {
    try {
      // 构建作用域对象
      const scope: Record<string, number> = {};
      for (const [key, index] of this.keyToIndex) {
        scope[key] = this.scopeArray[index];
      }

      return this.mathInstance.evaluate(expression, scope);
    } catch (error) {
      console.error(`Failed to evaluate expression: ${expression}`, error);
      throw error;
    }
  }

  batchSetVariables(values: Float64Array): void {
    // 批量设置变量值
    this.scopeArray.set(values);
  }

  getScopeArray(): Float64Array {
    return this.scopeArray;
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

  /** 数学作用域 */
  private readonly mathScope: MathScope;

  /** 脏属性队列 - 使用Uint32Array作为位图 */
  private readonly dirtyBitmap: Uint32Array;

  /** 计算函数存储 */
  private readonly computationFunctions: Map<number, (scope: Float64Array) => number>;

  /** 属性键映射 */
  private readonly keyToIndex: Map<T, number>;
  private readonly indexToKey: T[];

  // ==================== 性能统计 ====================

  private readonly stats = {
    computations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastUpdateTime: 0,
    batchUpdates: 0,
  };

  // ==================== 构造函数 ====================

  constructor(attrKeys: T[], expressions?: Map<T, AttributeExpression<T>>) {
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
    attrKeys.forEach((key, index) => {
      this.keyToIndex.set(key, index);
    });

    // 初始化依赖图和数学作用域
    this.dependencyGraph = new DependencyGraph(keyCount);
    this.mathScope = new MathScope(attrKeys);
    this.computationFunctions = new Map();

    console.log(`🚀 ReactiveSystem initialized with ${keyCount} attributes`);

    // 设置表达式
    if (expressions) {
      this.setupExpressions(expressions);
    }

    // 标记所有属性为脏值
    this.markAllDirty();
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
    const baseArray = this.modifierArrays[ModifierArrayIndex.BASE_VALUE];
    
    for (const [attr, value] of Object.entries(values)) {
      const index = this.keyToIndex.get(attr as T);
      if (index !== undefined && typeof value === 'number') {
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

      console.log(`📐 设置属性 ${attrName} 的表达式: ${expressionData.expression}`);

      // 设置计算函数
      this.computationFunctions.set(index, (scope: Float64Array) => {
        try {
          // 更新数学作用域
          this.mathScope.batchSetVariables(scope);
          return this.mathScope.evaluate(expressionData.expression);
        } catch (error) {
          console.error(`❌ 计算属性 ${attrName} 时出错:`, error);
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
    // 简化的依赖解析，查找表达式中的变量名
    for (const [key, dependencyIndex] of this.keyToIndex) {
      if (expression.includes(key) && dependencyIndex !== attrIndex) {
        this.dependencyGraph.addDependency(attrIndex, dependencyIndex);
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

    const arrayIndex = index >>> 5; // index / 32
    const bitIndex = index & 31;    // index % 32
    this.dirtyBitmap[arrayIndex] |= (1 << bitIndex);

    BitFlags.set(this.flags, index, AttributeFlags.IS_DIRTY);
    BitFlags.clear(this.flags, index, AttributeFlags.IS_CACHED);

    // 标记所有依赖此属性的属性为脏值
    const dependents = this.dependencyGraph.getDependents(index);
    for (const dependent of dependents) {
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
    this.dirtyBitmap.fill(0xFFFFFFFF); // 设置所有位为1
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
        total: this.values.byteLength + this.flags.byteLength + 
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

    const numericValue = typeof value === 'number' ? value : value.value;
    this.modifierArrays[ModifierArrayIndex.BASE_VALUE][index] = numericValue;
    this.markDirty(index);
  }

  /**
   * 从角色数据解析修饰符（兼容原API）
   */
  parseModifiersFromCharacter(character: any, sourceName: string): void {
    console.log(`🔄 从角色数据解析修饰符: ${sourceName}`);
    
    // 这里可以根据需要实现具体的解析逻辑
    // 暂时作为占位符实现
    const source: ModifierSource = {
      id: "character_data",
      name: sourceName,
      type: "system",
    };

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
        dependencies: Array.from(this.dependencyGraph.getDependencies(i)).map(idx => this.indexToKey[idx]),
        dependents: Array.from(this.dependencyGraph.getDependents(i)).map(idx => this.indexToKey[idx]),
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
        result[key] = dependents.map(idx => this.indexToKey[idx]);
      }
    }
    
    return result;
  }
}