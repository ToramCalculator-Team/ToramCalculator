import { CharacterAttrEnum } from "./utils";
import { create, all } from "mathjs";

// 创建 math 实例
const math = create(all);

export interface AttributeExpression {
  expression: string;
  isBase?: boolean;
}

export const ATTRIBUTE_EXPRESSIONS = new Map<CharacterAttrEnum, AttributeExpression>([
  // 基础属性
  [CharacterAttrEnum.LV, { expression: "LV", isBase: true }],
  [CharacterAttrEnum.STR, { expression: "STR", isBase: true }],
  [CharacterAttrEnum.INT, { expression: "INT", isBase: true }],
  [CharacterAttrEnum.VIT, { expression: "VIT", isBase: true }],
  [CharacterAttrEnum.AGI, { expression: "AGI", isBase: true }],
  [CharacterAttrEnum.DEX, { expression: "DEX", isBase: true }],
  [CharacterAttrEnum.LUK, { expression: "LUK", isBase: true }],
  [CharacterAttrEnum.TEC, { expression: "TEC", isBase: true }],
  [CharacterAttrEnum.MEN, { expression: "MEN", isBase: true }],
  [CharacterAttrEnum.CRI, { expression: "CRI", isBase: true }],
  
  // 武器攻击力
  [CharacterAttrEnum.WEAPON_ATK, {
    expression: "WEAPON_BASE_ATK * (1 + WEAPON_REFINEMENT * 0.03)"
  }],
  
  // 物理攻击力
  [CharacterAttrEnum.PHYSICAL_ATK, {
    expression: "floor(LV + WEAPON_ATK * WEAPON_PATK_COEFF + STR * WEAPON_STR_PATK_COEFF + INT * WEAPON_INT_PATK_COEFF + AGI * WEAPON_AGI_PATK_COEFF + DEX * WEAPON_DEX_PATK_COEFF)"
  }],
  
  // 魔法攻击力
  [CharacterAttrEnum.MAGICAL_ATK, {
    expression: "floor(LV + WEAPON_ATK * WEAPON_MATK_COEFF + INT * WEAPON_INT_MATK_COEFF + STR * WEAPON_STR_MATK_COEFF + AGI * WEAPON_AGI_MATK_COEFF + DEX * WEAPON_DEX_MATK_COEFF)"
  }],
  
  // 攻击速度
  [CharacterAttrEnum.ASPD, {
    expression: "1000 + floor(AGI * 2 + DEX * 1.5)"
  }]
]);

/**
 * 从表达式中提取依赖的属性
 */
function extractDependenciesFromExpression(expression: string): CharacterAttrEnum[] {
  const node = math.parse(expression);
  const dependencies = new Set<CharacterAttrEnum>();

  // 遍历语法树，查找所有 SymbolNode
  node.traverse((node) => {
    if (node.type === "SymbolNode" && "name" in node) {
      // 尝试将符号名转换为枚举
      const symbolNode = node as { name: string };
      const enumName = symbolNode.name as keyof typeof CharacterAttrEnum;
      const enumValue = CharacterAttrEnum[enumName];
      
      // 只添加属性枚举，忽略其他变量（如 WEAPON_BASE_ATK）
      if (typeof enumValue === "number") {
        dependencies.add(enumValue);
      }
    }
  });

  return Array.from(dependencies);
}

/**
 * 获取属性的依赖图
 */
export function getDependencyGraph(): Record<number, CharacterAttrEnum[]> {
  const graph: Record<number, CharacterAttrEnum[]> = {};
  
  for (const [attr, expression] of ATTRIBUTE_EXPRESSIONS) {
    if (expression.isBase) {
      graph[attr] = [];
    } else {
      graph[attr] = extractDependenciesFromExpression(expression.expression);
    }
  }
  
  return graph;
}

/**
 * 获取属性的拓扑排序
 */
export function getTopologicalOrder(): CharacterAttrEnum[] {
  const graph = getDependencyGraph();
  const visited = new Set<CharacterAttrEnum>();
  const temp = new Set<CharacterAttrEnum>();
  const order: CharacterAttrEnum[] = [];
  
  function visit(attr: CharacterAttrEnum) {
    if (temp.has(attr)) {
      throw new Error(`检测到循环依赖: ${CharacterAttrEnum[attr]}`);
    }
    if (visited.has(attr)) return;
    
    temp.add(attr);
    const deps = graph[attr] || [];
    for (const dep of deps) {
      visit(dep);
    }
    temp.delete(attr);
    visited.add(attr);
    order.push(attr);
  }
  
  // 先访问所有基础属性
  for (const [attr, expression] of ATTRIBUTE_EXPRESSIONS) {
    if (expression.isBase) {
      visit(attr);
    }
  }
  
  // 再访问所有计算属性
  for (const [attr, expression] of ATTRIBUTE_EXPRESSIONS) {
    if (!expression.isBase) {
      visit(attr);
    }
  }
  
  return order;
}

// 添加缓存以提升性能
let cachedDependencyGraph: Record<number, CharacterAttrEnum[]> | null = null;
let cachedTopologicalOrder: CharacterAttrEnum[] | null = null;

/**
 * 获取缓存的依赖图
 */
export function getCachedDependencyGraph(): Record<number, CharacterAttrEnum[]> {
  if (!cachedDependencyGraph) {
    cachedDependencyGraph = getDependencyGraph();
  }
  return cachedDependencyGraph;
}

/**
 * 获取缓存的拓扑排序
 */
export function getCachedTopologicalOrder(): CharacterAttrEnum[] {
  if (!cachedTopologicalOrder) {
    cachedTopologicalOrder = getTopologicalOrder();
  }
  return cachedTopologicalOrder;
}

/**
 * 清除缓存（在表达式发生变化时调用）
 */
export function clearCache(): void {
  cachedDependencyGraph = null;
  cachedTopologicalOrder = null;
} 