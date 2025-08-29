import type { MemberWithRelations } from "@db/repositories/member";
import { ModifierType, type StatContainer } from "../../dataSys/StatContainer";
import { tokenizer, parse } from "acorn";
import { create, all } from "mathjs";
import * as Enums from "@db/schema/enums";

/**
 * PrebattleModifiers
 * - 解析并应用战前常驻修饰（装备与被动技能）
 * - 语法示例：
 *   - "element = light"
 *   - "atk.p + 6%"
 *   - "atk.p + (6 * skill.lv)%"
 */

/** 修饰符来源类型 */
type SourceType = "equipment" | "skill" | "system";

/** 右侧表达式求值上下文（支持 skill.lv 与环境对象） */
type EvalContext = { skill?: { lv: number }; env?: Record<string, unknown> };

/** 解析后的标准修饰项 */
interface NormalizedModifier<T extends string> {
  attr: T;
  targetType: ModifierType;
  value: number;
  source: { id: string; name: string; type: SourceType };
}

// 枚举字符串到数字索引
/**
 * 枚举字符串到数字索引映射（大小写不敏感）
 * - 从 db/schema/enums.ts 收集所有以 _TYPE 结尾的枚举
 * - 同时注册原值与其小写形式，便于解析如 "element = light"
 */
function buildEnumMap(): Map<string, number> {
  const mapping = new Map<string, number>();
  Object.entries(Enums).forEach(([key, value]) => {
    if (Array.isArray(value) && key.endsWith("_TYPE")) {
      (value as string[]).forEach((v, i) => {
        mapping.set(v, i);
        mapping.set(v.toLowerCase(), i);
      });
    }
  });
  return mapping;
}

const ENUM_MAP = buildEnumMap();

/** 在表达式中作为对象根引用的标识符（不应当被枚举替换） */
const VARIABLE_ROOTS = new Set<string>(["armor", "mainWeapon", "subWeapon", "skill"]);

function mapEnumValueToIndex(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const mapped = ENUM_MAP.get(value) ?? ENUM_MAP.get(value.toLowerCase());
    if (mapped !== undefined) return mapped;
  }
  return 0;
}

/**
 * 在受限沙盒中求值右侧表达式（基于 mathjs）
 * - 支持：数字、+ - * / ^、括号、三元(?:)、逻辑(&&,||,??)、skill.lv、以及枚举常量
 */
export function evalAstExpression(code: string, ctx: EvalContext): number {
  const ast = parse(code, { ecmaVersion: 2020, sourceType: "script" });
  if (!ast.body || ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement") {
    throw new Error("invalid expression");
  }
  const node: any = ast.body[0].expression;

  const math = create(all, { number: "number", matrix: "Array" });
  const scope: Record<string, unknown> = {
    skill: ctx.skill || { lv: 0 },
    nullish: (a: unknown, b: unknown) => (a === null || a === undefined ? b : a),
    ternary: (c: unknown, t: unknown, f: unknown) => (c ? t : f),
    bool: (x: unknown) => (x ? 1 : 0),
  };
  // 注入外部环境（如 armor / mainWeapon / subWeapon）
  if (ctx.env) {
    Object.assign(scope, ctx.env);
  }

  // 将 acorn AST 转为 mathjs 可识别表达式，并把枚举常量替换为数字
  const toExpr = (n: any): string => {
    switch (n.type) {
      case "Literal": {
        if (typeof n.value === "number") return String(n.value);
        if (typeof n.value === "string") {
          const key = n.value as string;
          const mapped = ENUM_MAP.get(key) ?? ENUM_MAP.get(key.toLowerCase());
          return String(mapped ?? 0);
        }
        return "0";
      }
      case "Identifier": {
        // 作为根对象名时，不做枚举替换
        if (VARIABLE_ROOTS.has(n.name)) return n.name;
        // 裸标识按枚举常量解析（例如：element = light）
        const mapped = ENUM_MAP.get(n.name) ?? ENUM_MAP.get((n.name as string).toLowerCase());
        if (mapped !== undefined) return String(mapped);
        throw new Error(`unknown identifier: ${n.name}`);
      }
      case "MemberExpression": {
        if (n.object.type === "Identifier" && n.property.type === "Identifier") {
          return `${toExpr(n.object)}.${n.property.name}`;
        }
        throw new Error("unsupported member expr");
      }
      case "UnaryExpression": {
        return `(${n.operator}${toExpr(n.argument)})`;
      }
      case "BinaryExpression": {
        const op = n.operator === "^" ? "^" : n.operator;
        return `(${toExpr(n.left)} ${op} ${toExpr(n.right)})`;
      }
      case "LogicalExpression": {
        if (n.operator === "&&") return `ternary(bool(${toExpr(n.left)}), ${toExpr(n.right)}, 0)`;
        if (n.operator === "||") return `ternary(bool(${toExpr(n.left)}), ${toExpr(n.left)}, ${toExpr(n.right)})`;
        if (n.operator === "??") return `nullish(${toExpr(n.left)}, ${toExpr(n.right)})`;
        throw new Error("unsupported logical op");
      }
      case "ConditionalExpression": {
        return `ternary(${toExpr(n.test)}, ${toExpr(n.consequent)}, ${toExpr(n.alternate)})`;
      }
      case "ParenthesizedExpression": {
        return `(${toExpr(n.expression)})`;
      }
      default:
        throw new Error(`unsupported node: ${n.type}`);
    }
  };

  const expr = toExpr(node);
  const value = math.evaluate(expr, scope) as unknown;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 解析一条修饰字符串，例如：
 * - "element = light"（赋值）
 * - "atk.p + 6%"（百分比修正）
 * - "atk.p + (6 * skill.lv)%"（带等级的百分比修正）
 */
function parseModifierLine<T extends string>(
  line: string,
  ctx: EvalContext,
  source: NormalizedModifier<T>["source"],
): NormalizedModifier<T> | null {
  const s = String(line || "").trim();
  const tk = tokenizer(s, { ecmaVersion: 5 });
  const tokens: Array<{ type: { label: string }; value?: string | number; start: number; end: number }> = [];
  while (true) {
    const t = tk.getToken();
    tokens.push(t);
    if (t.type?.label === "eof") break;
  }

  // 支持条件前缀：<cond> && <modifier>
  // 例如：armor.ability == "Light" && distanceDmg.short + 11%
  let andIndex = -1;
  let depth = 0;
  for (let idx = 0; idx < tokens.length; idx++) {
    const label = tokens[idx].type?.label;
    if (label === "(") depth++;
    else if (label === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && label === "&&") {
      andIndex = idx;
      break;
    }
  }
  if (andIndex !== -1) {
    const condStart = 0;
    const condEnd = tokens[andIndex].start as number;
    const rhsStart = tokens[andIndex + 1]?.start as number;
    const condExpr = s.slice(condStart, condEnd).trim();
    const rhsExpr = s.slice(rhsStart).trim();
    const condValue = Number(evalAstExpression(condExpr, ctx));
    if (!condValue) return null;
    return parseModifierLine(rhsExpr, ctx, source);
  }

  let i = 0;
  const expect = (label: string) => tokens[i] && tokens[i].type?.label === label;
  const take = () => tokens[i++];

  if (!expect("name")) throw new Error("attr expected");
  let attr = String(tokens[i].value) as T;
  take();
  while (expect(".")) {
    take();
    if (!expect("name")) throw new Error("attr segment expected");
    attr = (attr + "." + String(tokens[i].value)) as T;
    take();
  }

  // 若紧随其后是比较运算（条件前缀），尝试寻找顶层 &&，递归解析右侧；若无 && 则忽略该行
  if (
    tokens[i] &&
    (tokens[i].type?.label === "==" ||
      tokens[i].type?.label === "!=" ||
      tokens[i].type?.label === "===" ||
      tokens[i].type?.label === "!==")
  ) {
    let depth2 = 0;
    let andIdx2 = -1;
    for (let t = i; t < tokens.length; t++) {
      const lbl = tokens[t].type?.label;
      if (lbl === "(") depth2++;
      else if (lbl === ")") depth2 = Math.max(0, depth2 - 1);
      else if (depth2 === 0 && lbl === "&&") {
        andIdx2 = t;
        break;
      }
    }
    if (andIdx2 !== -1) {
      const rhsStart2 = tokens[andIdx2 + 1]?.start as number;
      const rhsExpr2 = s.slice(rhsStart2).trim();
      return parseModifierLine(rhsExpr2, ctx, source);
    }
    return null;
  }

  const opLabel = tokens[i]?.type?.label;
  const opValue = tokens[i]?.value as string | number | undefined;
  if (
    !(
      expect("+") ||
      expect("-") ||
      expect("=") ||
      opLabel === "+/-" ||
      opValue === "+" ||
      opValue === "-" ||
      opValue === "="
    )
  ) {
    console.warn("[PrebattleModifiers] operator expected after attr", {
      line: s,
      attr,
      next: tokens[i]?.type?.label,
      tokens: tokens.map((t) => t.type.label).join(" "),
    });
    throw new Error("op expected");
  }
  const op =
    opValue === "+" || opValue === "-" || opValue === "="
      ? (opValue as "+" | "-" | "=")
      : opLabel === "+/-"
        ? "+"
        : (tokens[i].type.label as "+" | "-" | "=");
  const opToken = take();

  // 表达式范围（支持 skill.lv 等）
  const exprStart = opToken.end;
  let j = tokens.length - 2; // 跳过 eof
  while (j >= 0 && tokens[j].type?.label === ";") j--;
  let isPercentage = false;
  if (j >= 0 && tokens[j].type?.label === "%") {
    isPercentage = true;
    j--;
  }
  if (j < 0) throw new Error("value expected");
  const exprEnd = tokens[j].end;
  const exprCode = s.slice(exprStart, exprEnd).trim();
  const value = exprCode ? evalAstExpression(exprCode, ctx) : 0;

  if (op === "=") {
    return { attr, targetType: ModifierType.BASE_VALUE, value, source };
  }

  const signed = op === "-" ? -value : value;
  return {
    attr,
    targetType: isPercentage ? ModifierType.STATIC_PERCENTAGE : ModifierType.STATIC_FIXED,
    value: signed,
    source,
  };
}

/** 仅接受 string[]，其它类型返回空数组 */
function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

/** 将路径片段格式化为点路径，并将数组索引渲染为 [i] 形式 */
function formatPathSegments(segments: string[]): string {
  const parts: string[] = [];
  for (const seg of segments) {
    if (/^\d+$/.test(seg) && parts.length > 0) {
      parts[parts.length - 1] = `${parts[parts.length - 1]}[${seg}]`;
    } else {
      parts.push(seg);
    }
  }
  return parts.join(".");
}

/**
 * 为来源生成更语义化的路径：
 * - 装备相关（weapon/subWeapon/armor/optEquip/speEquip）前缀为 equipment.
 * - 其他保持原始路径（如 avatar.top / consumables[0]）
 */
function formatRootedPathFromCharacter(segments: string[]): string {
  const formatted = formatPathSegments(segments);
  const root = segments[0];
  const equipmentRoots = new Set(["weapon", "subWeapon", "armor", "optEquip", "speEquip"]);
  if (root && equipmentRoots.has(root)) {
    return `equipment.${formatted}`;
  }
  return formatted || "character";
}

/**
 * 应用战前常驻修正：
 * - 装备节点下的 `modifiers: string[]`
 * - 被动技能模板下的 `logic: string[]` 与 `modifiers: string[]`
 * 语法支持见 parseModifierLine
 */
export function applyPrebattleModifiers<T extends string>(
  rs: StatContainer<T>,
  memberData: MemberWithRelations,
): void {
  const character = memberData.player!.character;

  const all: NormalizedModifier<T>[] = [];

  // 构建表达式环境：把角色当前配置映射进来（用于条件判断）
  const env = {
    armor: {
      ability: mapEnumValueToIndex(character?.armor?.ability),
    },
    mainWeapon: {
      type: mapEnumValueToIndex(character?.weapon?.type),
    },
    subWeapon: {
      type: mapEnumValueToIndex(character?.subWeapon?.type),
    },
  } as const;

  // 装备：递归遍历所有节点，收集 modifiers 属性
  const visit = (node: any, path: string[] = []) => {
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if ((k === "modifiers" || k === "cooking") && Array.isArray(v)) {
        // 找到 modifiers 属性，收集其中的修饰器
        const fullPath = formatRootedPathFromCharacter(path);
        const source = {
          id: fullPath,
          name: fullPath,
          type: "equipment" as const,
        };
        for (const line of toStringArray(v)) {
          const parsed = parseModifierLine<T>(line, { env }, source);
          if (parsed) {
            all.push(parsed);
          }
        }
      }

      if (Array.isArray(v) && k !== "logic") {
        // 数组类型，递归遍历每个元素
        v.forEach((item, index) => {
          visit(item, [...path, k, index.toString()]);
        });
      } else if (typeof v === "object" && k !== "logic") {
        // 对象类型，递归遍历
        visit(v, [...path, k]);
      }
    }
  };
  visit(character);

  // 被动技能：logic / modifiers 都可能是 string[]，且允许使用 skill.lv
  const skills: any[] = Array.isArray(character?.skills) ? character.skills : [];
  for (const s of skills) {
    const tpl = s?.template;
    const isPassive = Boolean(tpl?.isPassive ?? tpl?.passive);
    if (!tpl || !isPassive) continue;
    const lv = Number(s?.lv ?? s?.level ?? 0) || 0;
    const ctx: EvalContext = { skill: { lv }, env };
    const source = {
      id: `skill:${tpl.id ?? s?.id ?? "unknown"}`,
      name: String(tpl.name ?? "passive"),
      type: "skill" as const,
    };
    for (const line of [...toStringArray(tpl.logic), ...toStringArray(tpl.modifiers)]) {
      const parsed = parseModifierLine<T>(line, ctx, source);
      if (parsed) all.push(parsed);
    }
  }

  // 应用
  for (const m of all) {
    rs.addModifier(m.attr, m.targetType, m.value, m.source);
  }
}
