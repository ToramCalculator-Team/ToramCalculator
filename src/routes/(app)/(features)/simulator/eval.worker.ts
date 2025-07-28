import { CharacterWithRelations, type Character } from "@db/repositories/character";
import { MainHandType, SubHandType } from "@db/schema/enums";
import {
  CharacterAttrEnum,
  AttributeDependency,
  MainWeaponAbiT,
  dynamicTotalValue,
  DefaultModifiersData,
  AttrData,
  SubWeaponModifier,
} from "./base";


// 高性能响应式属性系统
class HighPerformanceAttributeSystem {
  private baseAttributes: Map<CharacterAttrEnum, AttrData<CharacterAttrEnum>> = new Map();
  private computedAttributes: Map<CharacterAttrEnum, AttrData<CharacterAttrEnum>> = new Map();
  private dependencyGraph: Map<CharacterAttrEnum, Set<CharacterAttrEnum>> = new Map();
  private updateQueue: Set<CharacterAttrEnum> = new Set();
  private isUpdating = false;
  private config: CharacterWithRelations;

  constructor(character: CharacterWithRelations) {
    this.config = character;
    this.initializeDependencyGraph();
    this.initializeBaseAttributes();
    this.setupComputedAttributes();
  }

  // 初始化依赖关系图
  private initializeDependencyGraph(): void {
    const dependencies: AttributeDependency<CharacterAttrEnum>[] = this.getAttributeDependencies();

    for (const dep of dependencies) {
      this.dependencyGraph.set(dep.target, new Set(dep.dependencies));
    }
  }

  // 初始化基础属性
  /**
   * 初始化基础属性（机体属性/装备基础值/特殊能力）
   * 
   * 1. 这些属性的 baseValue 由角色初始配置、装备、成长等直接决定（如角色面板的"能力点"分配、装备基础数值等）。
   * 2. modifiers（加成项）由装备、技能、被动、Buff等提供。
   * 3. 这些属性本身不是通过公式计算得出，而是作为一切衍生属性的"根"。
   * 4. 计算属性（如 atk、aspd、maxHp 等）不在此初始化，而是通过依赖关系和公式自动计算。
   *
   * 具体分类：
   * - 机体基础属性：LV, STR, INT, VIT, AGI, DEX
   * - 特殊能力：LUK, TEC, MEN, CRI（部分由 personalityType/personalityValue 提供）
   * - 装备基础值：MAINWEAPON_BASE_VALUE, SUBWEAPON_BASE_VALUE, BODYARMOR_BASE_VALUE
   * - 系统数值：WEAPON_MATK_CONVERSION_RATE, WEAPON_ATK_CONVERSION_RATE 等
   * - 基础属性：AGGRO, WEAPON_RANGE, HP_REGEN, MP_REGEN, MP_ATK_REGEN 等
   *
   * 例如：
   *   STR.baseValue 由角色分配点数直接决定，modifiers 由装备/技能等提供。
   *   MAINWEAPON_BASE_VALUE.baseValue 由装备面板提供，modifiers 由强化/附魔等提供。
   *
   * 计算属性如 PHYSICAL_ATK、ASPD、MAX_HP、HP、MP 等，不在此初始化，而是通过依赖关系和公式自动推导。
   */
  private initializeBaseAttributes(): void {
    // 基础属性列表（仅初始化机体/装备直接提供的属性，不含计算属性）
    const BASE_ATTRS = [
      // 机体基础属性（由角色分配点数直接决定）
      CharacterAttrEnum.LV,   // 等级（机体属性，直接由角色配置提供）
      CharacterAttrEnum.STR,  // 力量（机体属性，baseValue 由角色分配，modifiers 由装备/技能等提供）
      CharacterAttrEnum.INT,  // 智力（机体属性）
      CharacterAttrEnum.VIT,  // 耐力（机体属性）
      CharacterAttrEnum.AGI,  // 敏捷（机体属性）
      CharacterAttrEnum.DEX,  // 灵巧（机体属性）
      CharacterAttrEnum.LUK,  // 幸运（特殊能力，部分由 personalityType/personalityValue 提供）
      CharacterAttrEnum.TEC,  // 技巧（特殊能力）
      CharacterAttrEnum.MEN,  // 异抗（特殊能力）
      CharacterAttrEnum.CRI,  // 暴击（特殊能力）
      
      // 装备基础值（由装备面板直接提供）
      CharacterAttrEnum.MAINWEAPON_BASE_VALUE, // 主武器基础值（装备直接提供）
      CharacterAttrEnum.SUBWEAPON_BASE_VALUE,  // 副武器基础值（装备直接提供）
      CharacterAttrEnum.BODYARMOR_BASE_VALUE,  // 防具基础值（装备直接提供）
      
      // 系统数值（由系统决定基础值，加成项由自由数值决定）
      CharacterAttrEnum.WEAPON_MATK_CONVERSION_RATE, // 主武器魔法攻击转换率
      CharacterAttrEnum.WEAPON_ATK_CONVERSION_RATE,  // 主武器物理攻击转换率
      
      // 基础属性（由系统或角色配置直接决定，不依赖其他属性计算）
      CharacterAttrEnum.AGGRO,      // 仇恨值（基础值100）
      CharacterAttrEnum.WEAPON_RANGE, // 武器射程
      CharacterAttrEnum.HP_REGEN,   // HP自然回复
      CharacterAttrEnum.MP_REGEN,   // MP自然回复
      CharacterAttrEnum.MP_ATK_REGEN, // MP攻击回复
    ];

    for (const attr of BASE_ATTRS) {
      const baseValue = this.getBaseValue(attr);
      this.baseAttributes.set(attr, baseValue);
    }
  }

  // 获取基础值
  private getBaseValue(attr: CharacterAttrEnum): AttrData<CharacterAttrEnum> {
    const baseValue = this.getBaseValueNumber(attr);
    return {
      name: attr,
      baseValue,
      modifiers: DefaultModifiersData,
    };
  }

  // 获取基础数值
  private getBaseValueNumber(attr: CharacterAttrEnum): number {
    switch (attr) {
      // 机体基础属性
      case CharacterAttrEnum.LV:
        return this.config.lv;
      case CharacterAttrEnum.STR:
        return this.config.str;
      case CharacterAttrEnum.INT:
        return this.config.int;
      case CharacterAttrEnum.VIT:
        return this.config.vit;
      case CharacterAttrEnum.AGI:
        return this.config.agi;
      case CharacterAttrEnum.DEX:
        return this.config.dex;
      case CharacterAttrEnum.LUK:
        return this.config.personalityType === "Luk" ? this.config.personalityValue : 0;
      case CharacterAttrEnum.TEC:
        return this.config.personalityType === "Tec" ? this.config.personalityValue : 0;
      case CharacterAttrEnum.MEN:
        return this.config.personalityType === "Men" ? this.config.personalityValue : 0;
      case CharacterAttrEnum.CRI:
        return this.config.personalityType === "Cri" ? this.config.personalityValue : 0;
      
      // 装备基础值
      case CharacterAttrEnum.MAINWEAPON_BASE_VALUE:
        return (this.config.weapon.baseAbi ?? this.config.weapon.template.baseAbi) + this.config.weapon.extraAbi;
      case CharacterAttrEnum.SUBWEAPON_BASE_VALUE:
        return (
          (this.config.subWeapon.baseAbi ?? this.config.subWeapon.template.baseAbi) + this.config.subWeapon.extraAbi
        );
      case CharacterAttrEnum.BODYARMOR_BASE_VALUE:
        return (this.config.armor.baseAbi ?? this.config.armor.template.baseAbi) + this.config.armor.extraAbi;
      
      // 系统数值
      case CharacterAttrEnum.WEAPON_MATK_CONVERSION_RATE:
        return MainWeaponAbiT[this.config.weapon.template.type as MainHandType].weaAtk_Matk_Convert;
      case CharacterAttrEnum.WEAPON_ATK_CONVERSION_RATE:
        return MainWeaponAbiT[this.config.weapon.template.type as MainHandType].weaAtk_Patk_Convert;
      
      // 基础属性
      case CharacterAttrEnum.AGGRO:
        return 100; // 基础仇恨值
      case CharacterAttrEnum.WEAPON_RANGE:
        return 100; // 武器射程默认值
      case CharacterAttrEnum.HP_REGEN:
        return 0; // HP自然回复默认值
      case CharacterAttrEnum.MP_REGEN:
        return 0; // MP自然回复默认值
      case CharacterAttrEnum.MP_ATK_REGEN:
        return 0; // MP攻击回复默认值
      
      default:
        return 0;
    }
  }

  // 设置计算属性
  private setupComputedAttributes(): void {
    const sortedDependencies = this.sortDependenciesByDepth(this.getAttributeDependencies());

    for (const dependency of sortedDependencies) {
      this.createComputedAttribute(dependency);
    }
  }

  // 获取属性依赖关系
  private getAttributeDependencies(): AttributeDependency<CharacterAttrEnum>[] {
    const weaponType = this.config.weapon.template.type as MainHandType;
    const weaponAbiT = MainWeaponAbiT[weaponType];

    const subWeaponType = this.config.subWeapon.template.type as SubHandType;
    const subWeaponAbiT = SubWeaponModifier[subWeaponType];

    return [
    ];
  }

  // 创建计算属性
  private createComputedAttribute(dependency: AttributeDependency<CharacterAttrEnum>): void {
    const { target, dependencies, formula } = dependency;

    // 收集所有依赖属性的当前值（数值）
    const depValues: Record<CharacterAttrEnum, number> = {} as Record<CharacterAttrEnum, number>;
    for (const depAttr of dependencies) {
      depValues[depAttr] = this.getAttributeValueNumber(depAttr);
    }

    // 应用计算公式
    const computedValue = formula(depValues);
    
    // 创建 AttrData 结构
    const attrData: AttrData<CharacterAttrEnum> = {
      name: target,
      baseValue: computedValue,
      modifiers: DefaultModifiersData,
    };
    
    this.computedAttributes.set(target, attrData);
  }

  // 获取属性值
  private getAttributeValue(attr: CharacterAttrEnum): AttrData<CharacterAttrEnum> {
    // 优先从计算属性获取
    if (this.computedAttributes.has(attr)) {
      return this.computedAttributes.get(attr)!;
    }

    // 从基础属性获取
    return this.baseAttributes.get(attr) ?? { name: attr, baseValue: 0, modifiers: DefaultModifiersData };
  }

  // 获取属性数值（用于兼容性）
  private getAttributeValueNumber(attr: CharacterAttrEnum): number {
    const attrData = this.getAttributeValue(attr);
    return dynamicTotalValue(attrData);
  }

  // 拓扑排序依赖关系
  private sortDependenciesByDepth(dependencies: AttributeDependency<CharacterAttrEnum>[]): AttributeDependency<CharacterAttrEnum>[] {
    const dependencyGraph = new Map<CharacterAttrEnum, Set<CharacterAttrEnum>>();

    for (const dep of dependencies) {
      dependencyGraph.set(dep.target, new Set(dep.dependencies));
    }

    const sorted: AttributeDependency<CharacterAttrEnum>[] = [];
    const visited = new Set<CharacterAttrEnum>();
    const visiting = new Set<CharacterAttrEnum>();

    const visit = (target: CharacterAttrEnum) => {
      if (visiting.has(target)) {
        throw new Error(`Circular dependency detected: ${target}`);
      }
      if (visited.has(target)) return;

      visiting.add(target);
      const deps = dependencyGraph.get(target);
      if (deps) {
        for (const dep of deps) {
          visit(dep);
        }
      }
      visiting.delete(target);
      visited.add(target);
    };

    for (const dep of dependencies) {
      if (!visited.has(dep.target)) {
        visit(dep.target);
      }
    }

    const visitOrder = Array.from(visited);
    return dependencies.sort((a, b) => {
      const aIndex = visitOrder.indexOf(a.target);
      const bIndex = visitOrder.indexOf(b.target);
      return aIndex - bIndex;
    });
  }

  // 设置基础属性值
  setPlayerAttr(attrName: CharacterAttrEnum, value: number): void {
    const currentAttr = this.baseAttributes.get(attrName) ?? { name: attrName, baseValue: 0, modifiers: DefaultModifiersData };
    currentAttr.baseValue = value;
    this.baseAttributes.set(attrName, currentAttr);
    this.markForUpdate(attrName);
  }

  // 设置属性数据
  setPlayerAttrData(attrName: CharacterAttrEnum, attrData: AttrData<CharacterAttrEnum>): void {
    this.baseAttributes.set(attrName, attrData);
    this.markForUpdate(attrName);
  }

  // 获取属性值（数值）
  getPlayerAttr(attrName: CharacterAttrEnum): number {
    return this.getAttributeValueNumber(attrName);
  }

  // 获取属性数据
  getPlayerAttrData(attrName: CharacterAttrEnum): AttrData<CharacterAttrEnum> {
    return this.getAttributeValue(attrName);
  }

  // 标记需要更新的属性
  private markForUpdate(attr: CharacterAttrEnum): void {
    if (this.isUpdating) {
      this.updateQueue.add(attr);
      return;
    }

    this.updateQueue.add(attr);
    this.processUpdates();
  }

  // 处理更新队列
  private processUpdates(): void {
    if (this.isUpdating || this.updateQueue.size === 0) return;

    this.isUpdating = true;
    const visited = new Set<CharacterAttrEnum>();

    while (this.updateQueue.size > 0) {
      const current = Array.from(this.updateQueue)[0];
      this.updateQueue.delete(current);

      if (visited.has(current)) continue;
      visited.add(current);

      this.updateAttribute(current);
      this.markDependentsForUpdate(current);
    }

    this.isUpdating = false;
  }

  // 更新单个属性
  private updateAttribute(attr: CharacterAttrEnum): void {
    const dependencies = this.getAttributeDependencies();
    const dep = dependencies.find((d) => d.target === attr);

    if (!dep) return;

    // 收集依赖值（数值）
    const depValues: Record<CharacterAttrEnum, number> = {} as Record<CharacterAttrEnum, number>;
    for (const depAttr of dep.dependencies) {
      depValues[depAttr] = this.getAttributeValueNumber(depAttr);
    }

    // 计算新值
    const newValue = dep.formula(depValues);
    
    // 创建 AttrData 结构
    const attrData: AttrData<CharacterAttrEnum> = {
      name: attr,
      baseValue: newValue,
      modifiers: DefaultModifiersData,
    };
    
    this.computedAttributes.set(attr, attrData);
  }

  // 标记依赖此属性的其他属性需要更新
  private markDependentsForUpdate(attr: CharacterAttrEnum): void {
    for (const [target, deps] of this.dependencyGraph) {
      if (deps.has(attr)) {
        this.updateQueue.add(target);
      }
    }
  }

  // 获取所有属性值
  getAllAttributes(): Record<CharacterAttrEnum, AttrData<CharacterAttrEnum>> {
    const result: Record<CharacterAttrEnum, AttrData<CharacterAttrEnum>> = {} as Record<CharacterAttrEnum, AttrData<CharacterAttrEnum>>;

    // 获取所有基础属性
    for (const [attr, value] of this.baseAttributes) {
      result[attr] = value;
    }

    // 获取所有计算属性
    for (const [attr, value] of this.computedAttributes) {
      result[attr] = value;
    }

    return result;
  }

  // 获取所有属性数值
  getAllAttributeNumbers(): Record<CharacterAttrEnum, number> {
    const result: Record<CharacterAttrEnum, number> = {} as Record<CharacterAttrEnum, number>;

    // 获取所有基础属性
    for (const [attr, value] of this.baseAttributes) {
      result[attr] = dynamicTotalValue(value);
    }

    // 获取所有计算属性
    for (const [attr, value] of this.computedAttributes) {
      result[attr] = dynamicTotalValue(value);
    }

    return result;
  }

  // 获取属性依赖关系信息
  getAttributeDependencyInfo(): AttributeDependency<CharacterAttrEnum>[] {
    return this.getAttributeDependencies();
  }

  // 清理资源
  cleanup(): void {
    this.baseAttributes.clear();
    this.computedAttributes.clear();
    this.dependencyGraph.clear();
    this.updateQueue.clear();
  }
}

// 导出响应式属性系统类
export { HighPerformanceAttributeSystem };