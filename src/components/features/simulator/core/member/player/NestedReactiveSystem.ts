/**
 * 嵌套结构响应式系统
 * 
 * 特性：
 * - 自动解析嵌套对象结构（如PlayerAttr）
 * - 支持嵌套路径访问（如 mainWeapon.baseAtk）
 * - 保持原有的响应式计算能力
 * - 扁平化内部存储，但提供嵌套访问接口
 */

import { create, all } from "mathjs";
import type { ModifierSource, Modifier, AttributeExpression } from "../ReactiveSystem";

// 创建 math 实例
const math = create(all);

// ============================== 类型定义 ==============================

export type NestedPath = string[];

export interface NestedAttributeExpression {
  path: NestedPath;
  expression: string;
  isBase?: boolean;
}

export interface NestedReactiveModifierData {
  // 原始数据层
  baseValue: Array<Modifier>;
  modifiers: {
    static: {
      fixed: Array<Modifier>;
      percentage: Array<Modifier>;
    };
    dynamic: {
      fixed: Array<Modifier>;
      percentage: Array<Modifier>;
    };
  };

  // 计算层
  computation: {
    updateFunction?: (scope: Map<string, number>) => number;
    dependencies: Set<string>; // 此属性依赖的其他属性（扁平化路径）
    dependents: Set<string>; // 依赖此属性的其他属性（扁平化路径）
    isDirty: boolean; // 是否需要重新计算
    lastComputedValue?: number; // 缓存的计算结果
  };
}

// ============================== 依赖图管理 ==============================

export class NestedDependencyGraph {
  private readonly dependencies = new Map<string, Set<string>>();
  private readonly dependents = new Map<string, Set<string>>();
  private sortedKeys: string[] = [];
  private isTopologySorted = false;

  constructor() {
    // 初始化
  }

  addDependency(dependent: string, dependency: string): void {
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

  removeDependency(dependent: string, dependency: string): void {
    this.dependencies.get(dependent)?.delete(dependency);
    this.dependents.get(dependency)?.delete(dependent);
    this.isTopologySorted = false;
  }

  getDependencies(attr: string): Set<string> {
    return this.dependencies.get(attr) || new Set();
  }

  getDependents(attr: string): Set<string> {
    return this.dependents.get(attr) || new Set();
  }

  getTopologicalOrder(): string[] {
    if (this.isTopologySorted) {
      return [...this.sortedKeys];
    }

    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (node: string) => {
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
    const allNodes = new Set<string>();
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

  getAffectedAttributes(changedAttr: string): Set<string> {
    const affected = new Set<string>();
    const queue: string[] = [changedAttr];

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

export class NestedMathScope {
  private readonly mathInstance: any;
  private readonly scopeMap = new Map<string, number>();
  private readonly functionMap = new Map<string, (...args: any[]) => any>();

  constructor() {
    this.mathInstance = math.create(all);
    this.registerBuiltinFunctions();
  }

  private registerBuiltinFunctions(): void {
    // 注册游戏相关的函数
    this.functionMap.set("mainWeaponAbiT", (weaponType: string) => {
      // 这里需要从外部获取武器类型数据，暂时返回模拟数据
      return {
        baseAspd: 100,
        baseHitRate: 80,
        patkC: 1.0,
        matkC: 0.0,
        abi_Attr_Convert: {
          str: {
            pAtkC: 1.0,
            mAtkC: 0.0,
            aspdC: 0.5,
            pStabC: 0.3,
          }
        }
      };
    });

    this.functionMap.set("subWeaponModifier", (weaponType: string) => {
      // 副武器修饰符，暂时返回模拟数据
      return {
        aspdM: 0.0,
        pAtkM: 0.0,
        mAtkM: 0.0,
        pDefM: 0.0,
        mDefM: 0.0,
      };
    });

    // 将自定义函数注册到 MathJS 实例
    for (const [name, func] of this.functionMap) {
      this.mathInstance.import({ [name]: func });
    }
  }

  setVariable(name: string, value: number): void {
    this.scopeMap.set(name, value);
  }

  setVariables(variables: Map<string, number>): void {
    for (const [name, value] of variables) {
      this.scopeMap.set(name, value);
    }
  }

  getVariable(name: string): number | undefined {
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

  getScopeMap(): ReadonlyMap<string, number> {
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

export class NestedExpressionParser {
  private readonly mathInstance: any;
  private readonly availablePaths: Set<string>;

  constructor(availablePaths: Set<string>) {
    this.mathInstance = math.create(all);
    this.availablePaths = availablePaths;
  }

  /**
   * 从表达式中提取依赖的属性路径
   */
  extractDependenciesFromExpression(expression: string): string[] {
    try {
      const node = this.mathInstance.parse(expression);
      const dependencies = new Set<string>();

      // 遍历语法树，查找所有 SymbolNode
      node.traverse((node: any) => {
        if (node.type === "SymbolNode" && "name" in node) {
          const symbolName = String(node.name);
          if (this.availablePaths.has(symbolName)) {
            dependencies.add(symbolName);
          } else {
            console.warn(`⚠️ 未找到属性路径: ${symbolName}`);
          }
        }
      });

      return Array.from(dependencies);
    } catch (error) {
      console.warn(`❌ 解析表达式依赖失败: ${expression}`, error);
      return [];
    }
  }
}

// ============================== 嵌套结构解析器 ==============================

export class NestedStructureParser {
  /**
   * 解析嵌套对象结构，提取所有可能的路径和表达式
   */
  static parseNestedStructure(
    nestedObj: Record<string, any>, 
    parentPath: NestedPath = []
  ): { paths: Set<string>; expressions: Map<string, NestedAttributeExpression> } {
    const paths = new Set<string>();
    const expressions = new Map<string, NestedAttributeExpression>();

    const traverse = (obj: any, currentPath: NestedPath) => {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = [...currentPath, key];
        const pathString = newPath.join('.');

        if (typeof value === 'string') {
          // 这是一个表达式
          paths.add(pathString);
          expressions.set(pathString, {
            path: newPath,
            expression: value,
            isBase: false,
          });
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // 这是一个嵌套对象，继续遍历
          traverse(value, newPath);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          // 这是一个基础值
          paths.add(pathString);
          expressions.set(pathString, {
            path: newPath,
            expression: String(value),
            isBase: true,
          });
        }
      }
    };

    traverse(nestedObj, parentPath);
    return { paths, expressions };
  }
}

// ============================== 嵌套响应式数据管理器 ==============================

export class NestedReactiveDataManager {
  private readonly attributes = new Map<string, NestedReactiveModifierData>();
  private readonly dependencyGraph = new NestedDependencyGraph();
  private readonly mathScope = new NestedMathScope();
  private readonly dirtySet = new Set<string>();
  private readonly pathToAttribute = new Map<string, NestedReactiveModifierData>();
  private isUpdating = false;

  // 性能统计
  private readonly stats = {
    computations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastUpdateTime: 0,
  };

  constructor(nestedStructure: Record<string, any>) {
    this.initializeFromNestedStructure(nestedStructure);
  }

  /**
   * 从嵌套结构初始化
   */
  private initializeFromNestedStructure(nestedStructure: Record<string, any>): void {
    const { paths, expressions } = NestedStructureParser.parseNestedStructure(nestedStructure);
    
    console.log(`🔍 解析嵌套结构，发现 ${paths.size} 个属性路径`);
    console.log(`🔍 发现 ${expressions.size} 个表达式`);

    // 为每个路径创建属性
    for (const pathString of paths) {
      this.createAttribute(pathString);
    }

    // 设置表达式和依赖关系
    this.setupExpressions(expressions);
  }

  /**
   * 创建属性
   */
  private createAttribute(pathString: string): void {
    const attributeData: NestedReactiveModifierData = {
      baseValue: [],
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
    };

    this.attributes.set(pathString, attributeData);
    this.pathToAttribute.set(pathString, attributeData);
  }

  /**
   * 设置属性表达式和依赖关系
   */
  private setupExpressions(expressions: Map<string, NestedAttributeExpression>): void {
    console.log("🔧 设置嵌套属性表达式和依赖关系...");

    // 获取所有可用的路径
    const availablePaths = new Set(this.attributes.keys());

    // 遍历所有属性表达式
    for (const [pathString, expressionData] of expressions) {
      // 跳过基础属性和空表达式
      if (expressionData.isBase || !expressionData.expression) {
        continue;
      }

      console.log(`📐 设置属性 ${pathString} 的表达式: ${expressionData.expression}`);

      // 为复杂属性设置更新函数
      this.addAttribute(pathString, {
        computation: {
          updateFunction: (scope: Map<string, number>) => {
            try {
              // 将 scope 中的值设置到 MathScope 中
              for (const [key, value] of scope) {
                this.mathScope.setVariable(key, value);
              }

              // 使用 MathJS 计算表达式
              const result = this.mathScope.evaluate(expressionData.expression);
              return result;
            } catch (error) {
              console.error(`❌ 计算属性 ${pathString} 时出错:`, error);
              return 0;
            }
          },
          dependencies: new Set(),
          dependents: new Set(),
          isDirty: true,
        },
      });

      // 从表达式解析依赖关系
      this.addDependenciesFromExpression(pathString, expressionData.expression, availablePaths);
    }

    console.log("✅ 嵌套属性表达式和依赖关系设置完成");
  }

  /**
   * 添加属性
   */
  addAttribute(name: string, data: Partial<NestedReactiveModifierData>): void {
    const existing = this.attributes.get(name);
    if (existing) {
      // 合并数据
      Object.assign(existing, data);
    } else {
      // 创建新的属性数据
      this.attributes.set(name, {
        baseValue: [],
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

  /**
   * 添加依赖关系
   */
  addDependency(dependent: string, dependency: string): void {
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
  addDependenciesFromExpression(attrName: string, expression: string, availablePaths: Set<string>): void {
    try {
      // 解析表达式获取依赖
      const parser = new NestedExpressionParser(availablePaths);
      const dependencies = parser.extractDependenciesFromExpression(expression);

      // 为每个依赖添加关系
      for (const dep of dependencies) {
        this.addDependency(attrName, dep);
      }

      console.log(`🔗 [${attrName}] 从表达式解析得到依赖: ${dependencies.join(', ')}`);
    } catch (error) {
      console.warn(`❌ 解析表达式依赖失败 [${attrName}]: ${expression}`, error);
    }
  }

  /**
   * 标记属性为脏值
   */
  markDirty(attrName: string): void {
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

  /**
   * 添加修饰符
   */
  addModifier(
    attrName: string,
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

  /**
   * 移除修饰符
   */
  removeModifier(attrName: string, sourceId: string): void {
    const attr = this.attributes.get(attrName);
    if (!attr) return;

    let removed = false;

    // 检查所有修饰符类型
    const modifierTypes = [
      'static.fixed',
      'static.percentage', 
      'dynamic.fixed',
      'dynamic.percentage'
    ] as const;

    for (const type of modifierTypes) {
      const [category, modifierType] = type.split('.');
      const index = attr.modifiers[category as keyof typeof attr.modifiers][modifierType as keyof any]
        .findIndex((mod: Modifier) => mod.source.id === sourceId);
      
      if (index !== -1) {
        attr.modifiers[category as keyof typeof attr.modifiers][modifierType as keyof any].splice(index, 1);
        removed = true;
      }
    }

    if (removed) {
      this.markDirty(attrName);
    }
  }

  /**
   * 设置基础值
   */
  setBaseValue(attrName: string, value: Modifier): void {
    const attr = this.attributes.get(attrName);
    if (!attr) {
      console.warn(`⚠️ 尝试设置不存在的属性的基础值: ${attrName}`);
      return;
    }
    if (attr.baseValue.some((mod) => mod.source.id === value.source.id)) {
      console.warn(`⚠️ 尝试设置重复的修饰器: ${attrName}`);
      return;
    }
    attr.baseValue.push(value);
    this.markDirty(attrName);
  }

  /**
   * 批量设置基础值
   */
  setBaseValues(values: Record<string, number>): void {
    const systemSource: ModifierSource = {
      id: "system",
      name: "系统",
      type: "system"
    };

    for (const [attrName, value] of Object.entries(values)) {
      if (typeof value === 'number') {
        const modifier: Modifier = {
          value,
          source: systemSource
        };
        this.setBaseValue(attrName, modifier);
      }
    }
  }

  /**
   * 计算属性值
   */
  private computeAttributeValue(attrName: string): number {
    const attr = this.attributes.get(attrName);
    if (!attr) {
      console.warn(`⚠️ 尝试计算不存在的属性: ${attrName}`);
      return 0;
    }

    this.stats.computations++;

    // 如果有自定义计算函数，使用它
    if (attr.computation.updateFunction) {
      try {
        const scope = new Map<string, number>();
        for (const [key, value] of this.attributes) {
          // 避免递归调用 getValue，直接获取基础值或缓存值
          const targetAttr = this.attributes.get(key);
          if (targetAttr) {
            if (targetAttr.computation.lastComputedValue !== undefined) {
              // 使用缓存值
              scope.set(key, targetAttr.computation.lastComputedValue);
            } else if (!targetAttr.computation.updateFunction) {
              // 基础属性，直接计算
              const base = targetAttr.baseValue.reduce((sum, mod) => sum + mod.value, 0);
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
              const base = targetAttr.baseValue.reduce((sum, mod) => sum + mod.value, 0);
              scope.set(key, base);
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
    const base = attr.baseValue.reduce((sum, mod) => sum + mod.value, 0);
    const staticFixed = attr.modifiers.static.fixed.reduce((sum, mod) => sum + mod.value, 0);
    const staticPercentage = attr.modifiers.static.percentage.reduce((sum, mod) => sum + mod.value, 0);
    const dynamicFixed = attr.modifiers.dynamic.fixed.reduce((sum, mod) => sum + mod.value, 0);
    const dynamicPercentage = attr.modifiers.dynamic.percentage.reduce((sum, mod) => sum + mod.value, 0);

    const totalPercentage = staticPercentage + dynamicPercentage;
    const totalFixed = staticFixed + dynamicFixed;

    return Math.floor(base * (1 + totalPercentage / 100) + totalFixed);
  }

  /**
   * 更新脏值
   */
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

  /**
   * 获取属性值（支持嵌套路径）
   */
  getValue(path: NestedPath | string): number {
    const pathString = Array.isArray(path) ? path.join('.') : path;
    const attr = this.attributes.get(pathString);
    
    if (!attr) {
      console.warn(`⚠️ 尝试获取不存在的属性值: ${pathString}`);
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
    const value = this.computeAttributeValue(pathString);
    attr.computation.lastComputedValue = value;
    attr.computation.isDirty = false;
    return value;
  }

  /**
   * 设置属性值（支持嵌套路径）
   */
  setValue(path: NestedPath | string, value: number): void {
    const pathString = Array.isArray(path) ? path.join('.') : path;
    const attr = this.attributes.get(pathString);
    
    if (!attr) {
      console.warn(`⚠️ 尝试设置不存在的属性值: ${pathString}`);
      return;
    }

    // 设置基础值
    const systemSource: ModifierSource = {
      id: "direct_set",
      name: "直接设置",
      type: "system"
    };

    // 移除之前的直接设置值
    attr.baseValue = attr.baseValue.filter(mod => mod.source.id !== "direct_set");
    
    // 添加新的值
    attr.baseValue.push({
      value,
      source: systemSource
    });

    this.markDirty(pathString);
  }

  /**
   * 获取多个属性值
   */
  getValues(paths: (NestedPath | string)[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const path of paths) {
      const pathString = Array.isArray(path) ? path.join('.') : path;
      result[pathString] = this.getValue(path);
    }
    return result;
  }

  /**
   * 检查属性是否存在
   */
  hasAttribute(path: NestedPath | string): boolean {
    const pathString = Array.isArray(path) ? path.join('.') : path;
    return this.attributes.has(pathString);
  }

  /**
   * 获取所有属性路径
   */
  getAllPaths(): string[] {
    return Array.from(this.attributes.keys());
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      totalAttributes: this.attributes.size,
      dirtyCount: this.dirtySet.size,
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
  }

  /**
   * 获取MathScope
   */
  getMathScope(): NestedMathScope {
    return this.mathScope;
  }
} 