/**
 * 优化的响应式系统核心实现
 * 
 * 特性：
 * - 双层架构：原始数据层 + 高性能计算层
 * - Map优化：专为MathJS优化的高性能Map作用域
 * - 智能缓存：只重算变化的属性，避免级联重复计算
 * - 依赖管理：自动依赖追踪和传播
 */

import { type MathNode, all, create, floor, max, min, parse } from "mathjs";
import { 
  CharacterAttrEnum
} from "./utils";

// ============================== 核心接口定义 ==============================

export interface ModifierSource {
  id: string;
  name: string;
  type: 'equipment' | 'skill' | 'buff' | 'debuff' | 'passive' | 'system';
}

export interface ReactiveModifierData {
  baseValue: number;
  staticFixed: Array<{ value: number; source: ModifierSource }>;
  staticPercentage: Array<{ value: number; source: ModifierSource }>;
  dynamicFixed: Array<{ value: number; source: ModifierSource }>;
  dynamicPercentage: Array<{ value: number; source: ModifierSource }>;
  updateFunction?: (scope: Map<string, number>) => number;
  dependencies: Set<string>;  // 此属性依赖的其他属性
  dependents: Set<string>;    // 依赖此属性的其他属性
  isDirty: boolean;           // 是否需要重新计算
  lastComputedValue?: number; // 缓存的计算结果
}

export interface ComputeContext {
  readonly mathScope: Map<string, number>;
  readonly frame: number;
  readonly timestamp: number;
}

// ============================== 依赖图管理器 ==============================

export class DependencyGraph {
  private readonly dependencies = new Map<string, Set<string>>();
  private readonly dependents = new Map<string, Set<string>>();
  private readonly sortedKeys: string[] = [];
  private isTopologySorted = false;

  /**
   * 添加依赖关系
   * @param dependent 依赖者
   * @param dependency 被依赖者
   */
  addDependency(dependent: string, dependency: string): void {
    // 添加到依赖映射
    if (!this.dependencies.has(dependent)) {
      this.dependencies.set(dependent, new Set());
    }
    this.dependencies.get(dependent)!.add(dependency);

    // 添加到被依赖映射
    if (!this.dependents.has(dependency)) {
      this.dependents.set(dependency, new Set());
    }
    this.dependents.get(dependency)!.add(dependent);

    this.isTopologySorted = false;
  }

  /**
   * 获取属性的所有依赖
   */
  getDependencies(attr: string): Set<string> {
    return this.dependencies.get(attr) || new Set();
  }

  /**
   * 获取依赖某属性的所有属性
   */
  getDependents(attr: string): Set<string> {
    return this.dependents.get(attr) || new Set();
  }

  /**
   * 获取拓扑排序后的属性列表（用于正确的计算顺序）
   */
  getTopologicalOrder(): string[] {
    if (!this.isTopologySorted) {
      this.sortedKeys.length = 0;
      const visited = new Set<string>();
      const visiting = new Set<string>();

      const visit = (node: string) => {
        if (visiting.has(node)) {
          throw new Error(`Circular dependency detected involving ${node}`);
        }
        if (visited.has(node)) return;

        visiting.add(node);
        const deps = this.dependencies.get(node) || new Set();
        for (const dep of deps) {
          visit(dep);
        }
        visiting.delete(node);
        visited.add(node);
        this.sortedKeys.push(node);
      };

      // 访问所有节点
      for (const node of this.dependencies.keys()) {
        visit(node);
      }
      for (const node of this.dependents.keys()) {
        visit(node);
      }

      this.isTopologySorted = true;
    }

    return [...this.sortedKeys];
  }

  /**
   * 获取受影响的属性列表（从某个属性开始的级联影响）
   */
  getAffectedAttributes(changedAttr: string): Set<string> {
    const affected = new Set<string>();
    const queue = [changedAttr];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dependents = this.getDependents(current);
      
      for (const dependent of dependents) {
        if (!affected.has(dependent)) {
          affected.add(dependent);
          queue.push(dependent);
        }
      }
    }

    return affected;
  }
}

// ============================== MathJS 优化作用域 ==============================

export class MathScope {
  private readonly mathInstance: any;
  private readonly scopeMap = new Map<string, number>();
  private readonly functionMap = new Map<string, (...args: any[]) => any>();

  constructor() {
    // 创建 MathJS 实例
    this.mathInstance = create(all, {
      epsilon: 1e-12,
      matrix: "Matrix",
      number: "number",
      precision: 64,
      predictable: false,
    });

    // 注册自定义函数
    this.registerBuiltinFunctions();
  }

  /**
   * 注册内置函数到 MathJS
   */
  private registerBuiltinFunctions(): void {
    // 只注册自定义函数，不重复导入 MathJS 已有的内置函数
    const customFunctions = new Map<string, (...args: any[]) => any>();

    // 注册动态总值计算函数
    customFunctions.set('dynamicTotalValue', (attrName: string) => {
      return this.scopeMap.get(attrName) || 0;
    });

    // 注册武器类型判断函数
    customFunctions.set('isMainWeaponType', (weaponType: string, targetType: string) => {
      return weaponType === targetType ? 1 : 0;
    });

    // 将自定义函数添加到函数映射
    customFunctions.forEach((func, name) => {
      this.functionMap.set(name, func);
    });

    // 只导入自定义函数到 MathJS（floor, max, min 等是 MathJS 内置函数）
    this.mathInstance.import(Object.fromEntries(customFunctions));
  }

  /**
   * 设置作用域变量
   */
  setVariable(name: string, value: number): void {
    this.scopeMap.set(name, value);
  }

  /**
   * 批量设置作用域变量
   */
  setVariables(variables: Record<string, number>): void {
    for (const [name, value] of Object.entries(variables)) {
      this.scopeMap.set(name, value);
    }
  }

  /**
   * 获取变量值
   */
  getVariable(name: string): number | undefined {
    return this.scopeMap.get(name);
  }

  /**
   * 计算表达式
   */
  evaluate(expression: string): number {
    try {
      const result = this.mathInstance.evaluate(expression, this.scopeMap);
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.warn(`Failed to evaluate expression: ${expression}`, error);
      return 0;
    }
  }

  /**
   * 获取完整的作用域 Map（提供给外部使用）
   */
  getScopeMap(): ReadonlyMap<string, number> {
    return this.scopeMap;
  }

  /**
   * 解析表达式并返回语法树
   */
  parse(expression: string): any {
    return this.mathInstance.parse(expression);
  }

  /**
   * 检查是否为函数名
   */
  isFunctionName(name: string): boolean {
    // 检查是否为 MathJS 内置函数或自定义函数
    return this.functionMap.has(name) || 
           typeof this.mathInstance[name] === 'function' ||
           ['floor', 'max', 'min', 'abs', 'ceil', 'round', 'sqrt', 'pow', 'sin', 'cos', 'tan'].includes(name);
  }

  /**
   * 清空作用域
   */
  clear(): void {
    this.scopeMap.clear();
  }
}

// ============================== 响应式数据管理器 ==============================

export class ReactiveDataManager {
  private readonly attributes = new Map<string, ReactiveModifierData>();
  private readonly dependencyGraph = new DependencyGraph();
  private readonly mathScope = new MathScope();
  private readonly dirtySet = new Set<string>();
  private isUpdating = false;

  // 性能统计
  private readonly stats = {
    totalComputations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    updateCount: 0,
  };

  constructor() {
    this.initializeDefaultAttributes();
  }

  /**
   * 初始化默认属性
   */
  private initializeDefaultAttributes(): void {
    // 添加所有CharacterAttrEnum属性
    for (const attrName in CharacterAttrEnum) {
      if (isNaN(Number(attrName))) continue; // 跳过字符串键
      
      const attrEnum = Number(attrName);
      this.addAttribute(attrName, {
        baseValue: 0,
        staticFixed: [],
        staticPercentage: [],
        dynamicFixed: [],
        dynamicPercentage: [],
        dependencies: new Set(),
        dependents: new Set(),
        isDirty: true,
      });
    }

    this.setupAttributeDependencies();
  }

  /**
   * 设置属性依赖关系 - 从表达式自动推导
   */
  private setupAttributeDependencies(): void {
    // 这个方法现在是空的，依赖关系将通过 addDependenciesFromExpression 动态添加
    // 当 PlayerData 设置表达式时会自动构建依赖关系
  }

  /**
   * 添加属性
   */
  addAttribute(name: string, data: Partial<ReactiveModifierData>): void {
    const fullData: ReactiveModifierData = {
      baseValue: 0,
      staticFixed: [],
      staticPercentage: [],
      dynamicFixed: [],
      dynamicPercentage: [],
      dependencies: new Set(),
      dependents: new Set(),
      isDirty: true,
      ...data,
    };

    this.attributes.set(name, fullData);
    this.markDirty(name);
  }

  /**
   * 添加依赖关系
   */
  addDependency(dependent: string, dependency: string): void {
    this.dependencyGraph.addDependency(dependent, dependency);
    
    // 更新属性的依赖信息
    const dependentAttr = this.attributes.get(dependent);
    const dependencyAttr = this.attributes.get(dependency);
    
    if (dependentAttr) {
      dependentAttr.dependencies.add(dependency);
    }
    if (dependencyAttr) {
      dependencyAttr.dependents.add(dependent);
    }
  }

  /**
   * 从表达式自动构建依赖关系
   */
  addDependenciesFromExpression(attrName: string, expression: string): void {
    try {
      // 解析表达式获取依赖
      const node = this.mathScope.parse(expression);
      const dependencies = new Set<string>();

      // 创建枚举名称到枚举值的映射
      const enumNameToValue = new Map<string, string>();
      for (const [key, value] of Object.entries(CharacterAttrEnum)) {
        if (isNaN(Number(key))) {  // 只取字符串键
          enumNameToValue.set(key, value.toString());
        }
      }

      // 遍历语法树，查找所有 SymbolNode
      node.traverse((node: any) => {
        if (node.type === "SymbolNode" && "name" in node) {
          const symbolName = node.name as string;
          // 排除函数名（如 floor, max 等）
          if (!this.mathScope.isFunctionName(symbolName)) {
            // 检查是否是属性名称
            const enumValue = enumNameToValue.get(symbolName);
            if (enumValue) {
              dependencies.add(enumValue);
            }
          }
        }
      });

      // 为每个依赖添加关系
      for (const dep of dependencies) {
        this.addDependency(attrName, dep);
      }

      console.log(`🔗 [${attrName}] 从表达式解析得到依赖:`, Array.from(dependencies).map(d => CharacterAttrEnum[Number(d)]));
    } catch (error) {
      console.warn(`❌ 解析表达式依赖失败 [${attrName}]: ${expression}`, error);
    }
  }

  /**
   * 标记属性为脏值
   */
  markDirty(attrName: string): void {
    const attr = this.attributes.get(attrName);
    if (!attr) return;

    attr.isDirty = true;
    this.dirtySet.add(attrName);

    // 标记所有依赖此属性的属性为脏值
    const affected = this.dependencyGraph.getAffectedAttributes(attrName);
    for (const affectedAttr of affected) {
      const affectedAttrData = this.attributes.get(affectedAttr);
      if (affectedAttrData) {
        affectedAttrData.isDirty = true;
        this.dirtySet.add(affectedAttr);
      }
    }
  }

  /**
   * 添加修饰器
   */
  addModifier(
    attrName: string, 
    type: 'staticFixed' | 'staticPercentage' | 'dynamicFixed' | 'dynamicPercentage',
    value: number,
    source: ModifierSource
  ): void {
    const attr = this.attributes.get(attrName);
    if (!attr) return;

    attr[type].push({ value, source });
    this.markDirty(attrName);
  }

  /**
   * 移除修饰器
   */
  removeModifier(attrName: string, sourceId: string): void {
    const attr = this.attributes.get(attrName);
    if (!attr) return;

    let removed = false;

    // 从所有修饰器数组中移除
    ['staticFixed', 'staticPercentage', 'dynamicFixed', 'dynamicPercentage'].forEach(type => {
      const modifiers = attr[type as keyof typeof attr] as Array<{ source: ModifierSource }>;
      const originalLength = modifiers.length;
      
      for (let i = modifiers.length - 1; i >= 0; i--) {
        if (modifiers[i].source.id === sourceId) {
          modifiers.splice(i, 1);
          removed = true;
        }
      }
    });

    if (removed) {
      this.markDirty(attrName);
    }
  }

  /**
   * 设置基础值
   */
  setBaseValue(attrName: string, value: number): void {
    const attr = this.attributes.get(attrName);
    if (!attr) return;

    if (attr.baseValue !== value) {
      attr.baseValue = value;
      this.markDirty(attrName);
    }
  }

  /**
   * 计算属性的最终值
   */
  private computeAttributeValue(attrName: string): number {
    const attr = this.attributes.get(attrName);
    if (!attr) return 0;

    // 如果有自定义计算函数，使用它
    if (attr.updateFunction) {
      this.stats.totalComputations++;
      return attr.updateFunction(this.mathScope.getScopeMap() as Map<string, number>);
    }

    // 否则使用标准计算
    const base = attr.baseValue;
    const staticFixed = attr.staticFixed.reduce((sum, mod) => sum + mod.value, 0);
    const staticPercentage = attr.staticPercentage.reduce((sum, mod) => sum + mod.value, 0);
    const dynamicFixed = attr.dynamicFixed.reduce((sum, mod) => sum + mod.value, 0);
    const dynamicPercentage = attr.dynamicPercentage.reduce((sum, mod) => sum + mod.value, 0);

    const totalFixed = staticFixed + dynamicFixed;
    const totalPercentage = staticPercentage + dynamicPercentage;

    this.stats.totalComputations++;
    return Math.floor(base * (1 + totalPercentage / 100) + totalFixed);
  }

  /**
   * 更新所有脏值
   */
  updateDirtyValues(): void {
    if (this.isUpdating || this.dirtySet.size === 0) return;

    this.isUpdating = true;
    this.stats.updateCount++;

    try {
      // 获取拓扑排序的属性列表
      const sortedAttrs = this.dependencyGraph.getTopologicalOrder();
      
      // 按正确顺序更新脏值
      for (const attrName of sortedAttrs) {
        if (this.dirtySet.has(attrName)) {
          const attr = this.attributes.get(attrName);
          if (attr && attr.isDirty) {
            const newValue = this.computeAttributeValue(attrName);
            attr.lastComputedValue = newValue;
            attr.isDirty = false;
            
            // 更新 MathJS 作用域
            this.mathScope.setVariable(attrName, newValue);
            
            this.stats.cacheMisses++;
          }
        }
      }

      this.dirtySet.clear();
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 获取属性值
   */
  getValue(attrName: string): number {
    const attr = this.attributes.get(attrName);
    if (!attr) return 0;

    if (attr.isDirty) {
      this.updateDirtyValues();
    } else {
      this.stats.cacheHits++;
    }

    return attr.lastComputedValue || 0;
  }

  /**
   * 批量获取属性值
   */
  getValues(attrNames: string[]): Record<string, number> {
    this.updateDirtyValues(); // 一次性更新所有脏值
    
    const result: Record<string, number> = {};
    for (const attrName of attrNames) {
      result[attrName] = this.getValue(attrName);
    }
    
    return result;
  }

  /**
   * 获取 MathJS 作用域
   */
  getMathScope(): MathScope {
    this.updateDirtyValues();
    return this.mathScope;
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 重置性能统计
   */
  resetStats(): void {
    this.stats.totalComputations = 0;
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
    this.stats.updateCount = 0;
  }

  /**
   * 获取属性信息（调试用）
   */
  getAttributeInfo(attrName: string) {
    const attr = this.attributes.get(attrName);
    if (!attr) return null;

    return {
      baseValue: attr.baseValue,
      staticFixed: attr.staticFixed.length,
      staticPercentage: attr.staticPercentage.length,
      dynamicFixed: attr.dynamicFixed.length,
      dynamicPercentage: attr.dynamicPercentage.length,
      dependencies: Array.from(attr.dependencies),
      dependents: Array.from(attr.dependents),
      isDirty: attr.isDirty,
      lastComputedValue: attr.lastComputedValue,
    };
  }
} 