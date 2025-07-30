/**
 * 优化的响应式系统核心实现
 *
 * 特性：
 * - 双层架构：原始数据层 + 高性能计算层
 * - Map优化：专为MathJS优化的高性能Map作用域
 * - 智能缓存：只重算变化的属性，避免级联重复计算
 * - 依赖管理：自动依赖追踪和传播
 */

/**
 * 鉴于MathJs使用Map性能更好，且Map对嵌套结构支持较差，除了将属性从配置映射到原始数据层这一步会涉及到嵌套结构以外，
 * 其他数据都扁平化用Map储存
 */

/**
 * 实际上应该是三层数据，原始数据层，计算层，渲染层
 * 原始数据层：直接逆向游戏，结合BounsType和机体配置就可以获得
 * 计算层：需要逐步确认会用到哪些属性，然后渐进式添加
 * 渲染层：为了便于分析而设计的数据结构，
 * 计算层和渲染层都由原始数据层映射而来
 */

import { create, all } from "mathjs";

// 创建 math 实例
const math = create(all);

// ============================== 通用接口定义 ==============================

export interface ModifierSource {
  id: string;
  name: string;
  type: "equipment" | "skill" | "buff" | "debuff" | "passive" | "system";
}

export interface AttributeExpression<TAttr extends string> {
  expression: string;
  isBase?: boolean;
}

/**
 * 响应式修饰符数据 - 嵌套结构设计
 * 分离原始数据和计算逻辑，提升可读性和维护性
 */
export interface ReactiveModifierData<T extends string> {
  // 原始数据层
  baseValue: number;
  modifiers: {
    static: {
      fixed: Array<{ value: number; source: ModifierSource }>;
      percentage: Array<{ value: number; source: ModifierSource }>;
    };
    dynamic: {
      fixed: Array<{ value: number; source: ModifierSource }>;
      percentage: Array<{ value: number; source: ModifierSource }>;
    };
  };

  // 计算层
  computation: {
    updateFunction?: (scope: Map<T, number>) => number;
    dependencies: Set<T>; // 此属性依赖的其他属性
    dependents: Set<T>; // 依赖此属性的其他属性
    isDirty: boolean; // 是否需要重新计算
    lastComputedValue?: number; // 缓存的计算结果
  };
}

export interface ComputeContext<T extends string> {
  readonly mathScope: Map<T, number>;
  readonly frame: number;
  readonly timestamp: number;
}

// ============================== 依赖图管理 ==============================

export class DependencyGraph<T extends string> {
  private readonly dependencies = new Map<T, Set<T>>();
  private readonly dependents = new Map<T, Set<T>>();
  private sortedKeys: T[] = [];
  private isTopologySorted = false;

  constructor() {
    // 初始化
  }

  addDependency(dependent: T, dependency: T): void {
    // 确保依赖关系不指向自己
    if (dependent === dependency) {
      console.warn(`⚠️ 属性 ${dependent} 不能依赖自己`);
      return;
    }

    // 添加依赖关系
    if (!this.dependencies.has(dependent)) {
      this.dependencies.set(dependent, new Set());
    }
    this.dependencies.get(dependent)!.add(dependency);

    // 添加反向关系
    if (!this.dependents.has(dependency)) {
      this.dependents.set(dependency, new Set());
    }
    this.dependents.get(dependency)!.add(dependent);

    // 标记拓扑排序已过期
    this.isTopologySorted = false;
  }

  removeDependency(dependent: T, dependency: T): void {
    this.dependencies.get(dependent)?.delete(dependency);
    this.dependents.get(dependency)?.delete(dependent);
    this.isTopologySorted = false;
  }

  getDependencies(attr: T): Set<T> {
    return this.dependencies.get(attr) || new Set();
  }

  getDependents(attr: T): Set<T> {
    return this.dependents.get(attr) || new Set();
  }

  getTopologicalOrder(): T[] {
    if (this.isTopologySorted) {
      return [...this.sortedKeys];
    }

    const visited = new Set<T>();
    const temp = new Set<T>();
    const order: T[] = [];

    const visit = (node: T) => {
      if (temp.has(node)) {
        throw new Error(`检测到循环依赖: ${node}`);
      }
      if (visited.has(node)) {
        return;
      }

      temp.add(node);
      const deps = this.getDependencies(node);
      for (const dep of deps) {
        visit(dep);
      }
      temp.delete(node);
      visited.add(node);
      order.push(node);
    };

    // 获取所有节点
    const allNodes = new Set<T>();
    for (const [node] of this.dependencies) {
      allNodes.add(node);
    }
    for (const [node] of this.dependents) {
      allNodes.add(node);
    }

    // 对每个未访问的节点进行拓扑排序
    for (const node of allNodes) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    this.sortedKeys = order;
    this.isTopologySorted = true;
    return order;
  }

  getAffectedAttributes(changedAttr: T): Set<T> {
    const affected = new Set<T>();
    const queue: T[] = [changedAttr];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (affected.has(current)) continue;

      affected.add(current);
      const dependents = this.getDependents(current);
      for (const dependent of dependents) {
        queue.push(dependent);
      }
    }

    return affected;
  }

  clear(): void {
    this.dependencies.clear();
    this.dependents.clear();
    this.sortedKeys.length = 0;
    this.isTopologySorted = false;
  }
}

// ============================== MathJS 作用域管理 ==============================

export class MathScope<T extends string> {
  private readonly mathInstance: any;
  private readonly scopeMap = new Map<T, number>();
  private readonly functionMap = new Map<string, (...args: any[]) => any>();

  constructor() {
    this.mathInstance = math.create(all);
    this.registerBuiltinFunctions();
  }

  private registerBuiltinFunctions(): void {
    // 只注册自定义函数，避免与 MathJS 内置函数冲突
    this.functionMap.set("dynamicTotalValue", (attrName: string) => {
      // 这里需要从外部获取属性值，暂时返回0
      console.warn("dynamicTotalValue 函数需要外部上下文");
      return 0;
    });

    this.functionMap.set("isMainWeaponType", (weaponType: string) => {
      return weaponType === "main" ? 1 : 0;
    });

    // 将自定义函数注册到 MathJS 实例
    for (const [name, func] of this.functionMap) {
      this.mathInstance.import({ [name]: func });
    }
  }

  setVariable(name: T, value: number): void {
    this.scopeMap.set(name, value);
  }

  setVariables(variables: Map<T, number>): void {
    for (const [name, value] of variables) {
      this.scopeMap.set(name, value);
    }
  }

  getVariable(name: T): number | undefined {
    return this.scopeMap.get(name);
  }

  evaluate(expression: string): number {
    try {
      // 创建包含所有变量的作用域
      const scope: Record<string, number> = {};
      for (const [key, value] of this.scopeMap) {
        scope[key] = value;
      }

      return this.mathInstance.evaluate(expression, scope);
    } catch (error) {
      console.error(`Failed to evaluate expression: ${expression}`, error);
      throw error;
    }
  }

  getScopeMap(): ReadonlyMap<T, number> {
    return this.scopeMap;
  }

  parse(expression: string): any {
    return this.mathInstance.parse(expression);
  }

  isFunctionName(name: string): boolean {
    return this.functionMap.has(name) || typeof this.mathInstance[name] === "function";
  }

  clear(): void {
    this.scopeMap.clear();
  }
}

// ============================== 表达式解析工具 ==============================

export class ExpressionParser<TAttr extends string> {
  private readonly mathInstance: any;
  private readonly attrKeys: TAttr[];

  constructor(attrKeys: TAttr[]) {
    this.mathInstance = math.create(all);
    this.attrKeys = attrKeys;
  }

  /**
   * 从表达式中提取依赖的属性
   */
  extractDependenciesFromExpression(expression: string): TAttr[] {
    try {
      const node = this.mathInstance.parse(expression);
      const dependencies = new Set<TAttr>();

      // 遍历语法树，查找所有 SymbolNode
      node.traverse((node: any) => {
        if (node.type === "SymbolNode" && "name" in node) {
          const symbolName = String(node.name);
          if (this.attrKeys.includes(symbolName as TAttr)) {
            dependencies.add(symbolName as TAttr);
          } else {
            console.warn(`⚠️ 未找到属性: ${symbolName}`);
          }
        }
      });

      return Array.from(dependencies);
    } catch (error) {
      console.warn(`❌ 解析表达式依赖失败: ${expression}`, error);
      return [];
    }
  }

  /**
   * 构建依赖图
   */
  buildDependencyGraph(expressions: Map<TAttr, AttributeExpression<TAttr>>): DependencyGraph<TAttr> {
    const graph = new DependencyGraph<TAttr>();

    for (const [attr, expression] of expressions) {
      if (expression.isBase) {
        // 基础属性没有依赖
        continue;
      }

      const dependencies = this.extractDependenciesFromExpression(expression.expression);
      for (const dep of dependencies) {
        graph.addDependency(attr, dep);
      }
    }

    return graph;
  }

  /**
   * 获取拓扑排序
   */
  getTopologicalOrder(expressions: Map<TAttr, AttributeExpression<TAttr>>): TAttr[] {
    const graph = this.buildDependencyGraph(expressions);
    return graph.getTopologicalOrder();
  }
}

// ============================== 响应式数据管理器 ==============================

export class ReactiveDataManager<T extends string> {
  private readonly attributes = new Map<T, ReactiveModifierData<T>>();
  private readonly dependencyGraph = new DependencyGraph<T>();
  private readonly mathScope = new MathScope<T>();
  private readonly dirtySet = new Set<T>();
  private isUpdating = false;
  private attrKeys: T[];

  // 性能统计
  private readonly stats = {
    computations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastUpdateTime: 0,
  };

  constructor(attrKeys: T[], expressions?: Map<T, AttributeExpression<T>>) {
    this.attrKeys = attrKeys;
    this.initializeDefaultAttributes(attrKeys);

    if (expressions) {
      this.setupExpressions(expressions);
    }
  }

  private initializeDefaultAttributes(attrKeys: T[]): void {
    // 为每个属性创建默认的响应式数据结构
    for (const attrKey of attrKeys) {
      this.attributes.set(attrKey, {
        baseValue: 0,
        modifiers: {
          static: {
            fixed: [],
            percentage: [],
          },
          dynamic: {
            fixed: [],
            percentage: [],
          },
        },
        computation: {
          dependencies: new Set(),
          dependents: new Set(),
          isDirty: true,
        },
      });
    }
  }

  /**
   * 设置属性表达式和依赖关系
   * 单一事实来源：从表达式自动解析依赖并设置更新函数
   */
  private setupExpressions(expressions: Map<T, AttributeExpression<T>>): void {
    console.log("🔧 设置属性表达式和依赖关系...");

    // 遍历所有属性表达式
    for (const [attrName, expressionData] of expressions) {
      // 跳过基础属性和空表达式
      if (expressionData.isBase || !expressionData.expression) {
        continue;
      }

      console.log(`📐 设置属性 ${attrName} 的表达式: ${expressionData.expression}`);

      // 为复杂属性设置更新函数
      this.addAttribute(attrName, {
        computation: {
          updateFunction: (scope: Map<T, number>) => {
            try {
              // 将 scope 中的值设置到 MathScope 中
              for (const [key, value] of scope) {
                this.mathScope.setVariable(key, value);
              }

              // 使用 MathJS 计算表达式
              const result = this.mathScope.evaluate(expressionData.expression);
              return result;
            } catch (error) {
              console.error(`❌ 计算属性 ${attrName} 时出错:`, error);
              return 0;
            }
          },
          dependencies: new Set(),
          dependents: new Set(),
          isDirty: true,
        },
      });

      // 从表达式解析依赖关系
      this.addDependenciesFromExpression(attrName, expressionData.expression);
    }

    console.log("✅ 属性表达式和依赖关系设置完成");
  }

  addAttribute(name: T, data: Partial<ReactiveModifierData<T>>): void {
    const existing = this.attributes.get(name);
    if (existing) {
      // 合并数据
      Object.assign(existing, data);
    } else {
      // 创建新的属性数据
      this.attributes.set(name, {
        baseValue: 0,
        modifiers: {
          static: {
            fixed: [],
            percentage: [],
          },
          dynamic: {
            fixed: [],
            percentage: [],
          },
        },
        computation: {
          dependencies: new Set(),
          dependents: new Set(),
          isDirty: true,
        },
        ...data,
      });
    }
  }

  addDependency(dependent: T, dependency: T): void {
    this.dependencyGraph.addDependency(dependent, dependency);

    // 更新属性数据中的依赖关系
    const dependentData = this.attributes.get(dependent);
    const dependencyData = this.attributes.get(dependency);

    if (dependentData && dependencyData) {
      dependentData.computation.dependencies.add(dependency);
      dependencyData.computation.dependents.add(dependent);
    }
  }

  /**
   * 从表达式自动构建依赖关系
   */
  addDependenciesFromExpression(attrName: T, expression: string): void {
    try {
      // 解析表达式获取依赖
      const parser = new ExpressionParser(this.attrKeys);
      const dependencies = parser.extractDependenciesFromExpression(expression);

      // 为每个依赖添加关系
      for (const dep of dependencies) {
        this.addDependency(attrName, dep);
      }

      console.log(
        `🔗 [${attrName}] 从表达式解析得到依赖:`,
        dependencies.map((d) => (this.attrKeys.includes(d) ? d : null)),
      );
    } catch (error) {
      console.warn(`❌ 解析表达式依赖失败 [${attrName}]: ${expression}`, error);
    }
  }

  markDirty(attrName: T): void {
    if (!this.attributes.has(attrName)) {
      console.warn(`⚠️ 尝试标记不存在的属性为脏值: ${attrName}`);
      return;
    }

    this.dirtySet.add(attrName);

    // 标记所有依赖此属性的属性也为脏值
    const affected = this.dependencyGraph.getAffectedAttributes(attrName);
    for (const affectedAttr of affected) {
      this.dirtySet.add(affectedAttr);
    }
  }

  addModifier(
    attrName: T,
    type: "staticFixed" | "staticPercentage" | "dynamicFixed" | "dynamicPercentage",
    value: number,
    source: ModifierSource,
  ): void {
    const attr = this.attributes.get(attrName);
    if (!attr) {
      console.warn(`⚠️ 尝试为不存在的属性添加修饰器: ${attrName}`);
      return;
    }

    // 根据类型添加到对应的 modifiers 数组
    if (type === "staticFixed") {
      attr.modifiers.static.fixed.push({ value, source });
    } else if (type === "staticPercentage") {
      attr.modifiers.static.percentage.push({ value, source });
    } else if (type === "dynamicFixed") {
      attr.modifiers.dynamic.fixed.push({ value, source });
    } else if (type === "dynamicPercentage") {
      attr.modifiers.dynamic.percentage.push({ value, source });
    }
    this.markDirty(attrName);
  }

  removeModifier(attrName: T, sourceId: string): void {
    const attr = this.attributes.get(attrName);
    if (!attr) return;

    let removed = false;

    // 检查 static.fixed
    const staticFixedIndex = attr.modifiers.static.fixed.findIndex((mod) => mod.source.id === sourceId);
    if (staticFixedIndex !== -1) {
      attr.modifiers.static.fixed.splice(staticFixedIndex, 1);
      removed = true;
    }

    // 检查 static.percentage
    const staticPercentageIndex = attr.modifiers.static.percentage.findIndex((mod) => mod.source.id === sourceId);
    if (staticPercentageIndex !== -1) {
      attr.modifiers.static.percentage.splice(staticPercentageIndex, 1);
      removed = true;
    }

    // 检查 dynamic.fixed
    const dynamicFixedIndex = attr.modifiers.dynamic.fixed.findIndex((mod) => mod.source.id === sourceId);
    if (dynamicFixedIndex !== -1) {
      attr.modifiers.dynamic.fixed.splice(dynamicFixedIndex, 1);
      removed = true;
    }

    // 检查 dynamic.percentage
    const dynamicPercentageIndex = attr.modifiers.dynamic.percentage.findIndex((mod) => mod.source.id === sourceId);
    if (dynamicPercentageIndex !== -1) {
      attr.modifiers.dynamic.percentage.splice(dynamicPercentageIndex, 1);
      removed = true;
    }

    if (removed) {
      this.markDirty(attrName);
    }
  }

  setBaseValue(attrName: T, value: number): void {
    const attr = this.attributes.get(attrName);
    if (!attr) {
      console.warn(`⚠️ 尝试设置不存在的属性的基础值: ${attrName}`);
      return;
    }

    if (attr.baseValue !== value) {
      attr.baseValue = value;
      this.markDirty(attrName);
    }
  }

  setBaseValues(attrValues: Record<T, number>): void {
    for (const [attrName, value] of Object.entries(attrValues)) {
      this.setBaseValue(attrName as T, value as number);
    }
  }

  private computeAttributeValue(attrName: T): number {
    const attr = this.attributes.get(attrName);
    if (!attr) {
      console.warn(`⚠️ 尝试计算不存在的属性: ${attrName}`);
      return 0;
    }

    this.stats.computations++;

    // 如果有自定义计算函数，使用它
    if (attr.computation.updateFunction) {
      try {
        const scope = new Map<T, number>();
        for (const [key, value] of this.attributes) {
          // 避免递归调用 getValue，直接获取基础值或缓存值
          const targetAttr = this.attributes.get(key);
          if (targetAttr) {
            if (targetAttr.computation.lastComputedValue !== undefined) {
              // 使用缓存值
              scope.set(key, targetAttr.computation.lastComputedValue);
            } else if (!targetAttr.computation.updateFunction) {
              // 基础属性，直接计算
              const base = targetAttr.baseValue;
              const staticFixed = targetAttr.modifiers.static.fixed.reduce((sum, mod) => sum + mod.value, 0);
              const staticPercentage = targetAttr.modifiers.static.percentage.reduce((sum, mod) => sum + mod.value, 0);
              const dynamicFixed = targetAttr.modifiers.dynamic.fixed.reduce((sum, mod) => sum + mod.value, 0);
              const dynamicPercentage = targetAttr.modifiers.dynamic.percentage.reduce(
                (sum, mod) => sum + mod.value,
                0,
              );
              const totalPercentage = staticPercentage + dynamicPercentage;
              const totalFixed = staticFixed + dynamicFixed;
              const computedValue = Math.floor(base * (1 + totalPercentage / 100) + totalFixed);
              scope.set(key, computedValue);
            } else {
              // 复杂属性但没有缓存值，使用基础值作为临时值
              scope.set(key, targetAttr.baseValue);
            }
          }
        }
        return attr.computation.updateFunction(scope);
      } catch (error) {
        console.error(`❌ 计算属性 ${attrName} 时出错:`, error);
        return 0;
      }
    }

    // 否则使用标准计算
    const base = attr.baseValue;
    const staticFixed = attr.modifiers.static.fixed.reduce((sum, mod) => sum + mod.value, 0);
    const staticPercentage = attr.modifiers.static.percentage.reduce((sum, mod) => sum + mod.value, 0);
    const dynamicFixed = attr.modifiers.dynamic.fixed.reduce((sum, mod) => sum + mod.value, 0);
    const dynamicPercentage = attr.modifiers.dynamic.percentage.reduce((sum, mod) => sum + mod.value, 0);

    const totalPercentage = staticPercentage + dynamicPercentage;
    const totalFixed = staticFixed + dynamicFixed;

    return Math.floor(base * (1 + totalPercentage / 100) + totalFixed);
  }

  updateDirtyValues(): void {
    if (this.isUpdating) {
      console.warn("⚠️ 检测到递归更新，跳过");
      return;
    }

    this.isUpdating = true;
    const startTime = performance.now();

    try {
      // 获取拓扑排序，确保按正确顺序计算
      const order = this.dependencyGraph.getTopologicalOrder();

      // 先计算基础属性（没有 updateFunction 的属性）
      for (const attrName of order) {
        const attr = this.attributes.get(attrName);
        if (attr && !attr.computation.updateFunction && this.dirtySet.has(attrName)) {
          const value = this.computeAttributeValue(attrName);
          attr.computation.lastComputedValue = value;
          attr.computation.isDirty = false;
          this.dirtySet.delete(attrName);
        }
      }

      // 再计算复杂属性（有 updateFunction 的属性）
      for (const attrName of order) {
        const attr = this.attributes.get(attrName);
        if (attr && attr.computation.updateFunction && this.dirtySet.has(attrName)) {
          const value = this.computeAttributeValue(attrName);
          attr.computation.lastComputedValue = value;
          attr.computation.isDirty = false;
          this.dirtySet.delete(attrName);
        }
      }

      // 如果还有脏属性，说明存在循环依赖，强制计算一次
      if (this.dirtySet.size > 0) {
        console.warn(`⚠️ 检测到可能的循环依赖，强制计算剩余 ${this.dirtySet.size} 个属性`);
        const remainingDirty = Array.from(this.dirtySet);
        for (const attrName of remainingDirty) {
          const attr = this.attributes.get(attrName);
          if (attr) {
            const value = this.computeAttributeValue(attrName);
            attr.computation.lastComputedValue = value;
            attr.computation.isDirty = false;
            this.dirtySet.delete(attrName);
          }
        }
      }
    } finally {
      this.isUpdating = false;
      this.stats.lastUpdateTime = performance.now() - startTime;
    }
  }

  getValue(attrName: T): number {
    const attr = this.attributes.get(attrName);
    if (!attr) {
      console.warn(`⚠️ 尝试获取不存在的属性值: ${attrName}`);
      return 0;
    }

    // 如果属性是脏的，先更新
    if (attr.computation.isDirty) {
      this.updateDirtyValues();
    }

    // 如果有缓存值，使用缓存
    if (attr.computation.lastComputedValue !== undefined) {
      this.stats.cacheHits++;
      return attr.computation.lastComputedValue;
    }

    // 否则重新计算
    this.stats.cacheMisses++;
    const value = this.computeAttributeValue(attrName);
    attr.computation.lastComputedValue = value;
    attr.computation.isDirty = false;
    return value;
  }

  getValues(attrNames: T[]): Record<T, number> {
    const result: Record<T, number> = {} as Record<T, number>;
    for (const attrName of attrNames) {
      result[attrName] = this.getValue(attrName);
    }
    return result;
  }

  getMathScope(): MathScope<T> {
    return this.mathScope;
  }

  getStats() {
    return {
      ...this.stats,
      totalAttributes: this.attributes.size,
      dirtyCount: this.dirtySet.size,
    };
  }

  resetStats(): void {
    this.stats.computations = 0;
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
    this.stats.lastUpdateTime = 0;
  }

  /**
   * 解析修饰器表达式并添加到指定属性
   */
  parseAndAddModifier(attrName: T, expression: string, source: ModifierSource): void {
    try {
      // 解析表达式：target + value 或 target + value%
      const match = expression.match(/^(.+?)\s*([+\-])\s*(.+)$/);
      if (!match) {
        console.warn(`⚠️ 无法解析修饰器表达式: ${expression}`);
        return;
      }

      const targetStr = match[1].trim();
      const operator = match[2];
      const valueStr = match[3].trim();

      // 检查目标属性是否存在
      if (!this.attributes.has(attrName)) {
        console.warn(`⚠️ 目标属性 ${attrName} 不存在`);
        return;
      }

      // 判断是否为百分比修饰器
      const isPercentage = valueStr.endsWith("%");
      const cleanValueStr = isPercentage ? valueStr.slice(0, -1) : valueStr;

      // 计算数值
      let value: number;
      try {
        // 使用 MathJS 计算表达式值
        const mathScope = this.getMathScope();
        const scopeObject: Record<string, number> = {};
        for (const [key, val] of mathScope.getScopeMap()) {
          scopeObject[key] = val;
        }
        value = math.evaluate(cleanValueStr, scopeObject) as number;
      } catch (error) {
        console.warn(`⚠️ 无法计算修饰器值: ${cleanValueStr}`, error);
        return;
      }

      // 根据运算符调整值
      if (operator === "-") {
        value = -value;
      }

      // 确定修饰器类型
      const modifierType = isPercentage ? "staticPercentage" : "staticFixed";

      // 添加修饰器
      this.addModifier(attrName, modifierType, value, source);

      console.log(
        `✅ 成功添加修饰器: ${attrName} ${operator} ${value}${isPercentage ? "%" : ""} (来源: ${source.name})`,
      );
    } catch (error) {
      console.error(`❌ 解析修饰器表达式失败: ${expression}`, error);
    }
  }

  /**
   * 批量解析修饰器表达式
   * 从角色数据中收集所有 modifiers 字段并解析
   */
  parseModifiersFromCharacter(character: any, sourceName: string = "角色配置"): void {
    const source: ModifierSource = {
      id: sourceName,
      name: sourceName,
      type: "system",
    };

    // 递归收集所有 modifiers 字段
    const modifiers: string[] = [];

    const collectModifiers = (obj: unknown, path: string[] = []): void => {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          collectModifiers(item, [...path, index.toString()]);
        });
      } else if (obj && typeof obj === "object") {
        Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
          if (key === "modifiers" && Array.isArray(value)) {
            // 找到 modifiers 字段，收集所有字符串
            (value as unknown[]).forEach((modifier: unknown) => {
              if (typeof modifier === "string") {
                modifiers.push(modifier);
              } else if (modifier && typeof modifier === "object" && "formula" in modifier) {
                modifiers.push((modifier as { formula: string }).formula);
              }
            });
          } else {
            collectModifiers(value, [...path, key]);
          }
        });
      }
    };

    collectModifiers(character);

    console.log(`🔍 收集到 ${modifiers.length} 个修饰器表达式:`, modifiers);

    // 解析每个修饰器
    modifiers.forEach((modifier) => {
      // 尝试解析为 "属性名 + 值" 的格式
      const match = modifier.match(/^(\w+)\s*([+\-])\s*(.+)$/);
      if (match) {
        const targetAttr = match[1].toLowerCase();
        const operator = match[2];
        const value = match[3];

        // 尝试找到对应的属性枚举
        const attrKey = this.findAttributeKeyByString(targetAttr);
        if (attrKey) {
          this.parseAndAddModifier(attrKey, `${targetAttr} ${operator} ${value}`, source);
        } else {
          console.warn(`⚠️ 未找到对应的属性: ${targetAttr}`);
        }
      }
    });
  }

  /**
   * 根据字符串查找对应的属性键
   */
  private findAttributeKeyByString(attrString: string): T | null {
    const lowerAttrString = attrString.toLowerCase();

    // 直接检查属性名和显示名
    for (const attrKey of this.attrKeys) {
      if (attrKey.toLowerCase() === lowerAttrString) {
        return attrKey;
      }
    }

    return null;
  }
}
