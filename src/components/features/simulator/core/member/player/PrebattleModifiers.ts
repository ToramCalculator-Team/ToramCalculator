import type { MemberWithRelations } from "@db/repositories/member";
import { ModifierType, type ReactiveSystem } from "../ReactiveSystem";
import { CharacterWithRelations } from "@db/repositories/character";

type SourceType = "equipment" | "skill" | "system";

interface NormalizedModifier {
  attr: string;
  targetType: ModifierType;
  value: number;
  source: { id: string; name: string; type: SourceType };
}

/**
 * 规范化不同来源/形态的 modifiers 数据
 */
function normalizeModifier(
  raw: any,
  fallbackSource: { id: string; name: string; type: SourceType },
): NormalizedModifier | null {
  if (!raw || typeof raw !== "object") return null;

  // 识别属性键
  const attr = String(raw.attr ?? raw.attribute ?? raw.key ?? raw.path ?? raw.target ?? "").trim();
  if (!attr) return null;

  // 识别数值
  const value = Number(raw.value ?? raw.amount ?? raw.v ?? 0);
  if (!Number.isFinite(value)) return null;

  // 识别目标类型
  const t = String(raw.targetType ?? raw.type ?? raw.mode ?? "").toLowerCase();
  let targetType: ModifierType;
  switch (t) {
    case "base":
    case "base_value":
    case "basevalue":
      targetType = ModifierType.BASE_VALUE;
      break;
    case "percent":
    case "percentage":
    case "rate":
      targetType = ModifierType.STATIC_PERCENTAGE;
      break;
    case "fixed":
    case "flat":
    case "add":
    default:
      targetType = ModifierType.STATIC_FIXED;
      break;
  }

  const src = {
    id: String(raw.sourceId ?? fallbackSource.id),
    name: String(raw.sourceName ?? fallbackSource.name),
    type: (raw.sourceType as SourceType) ?? fallbackSource.type,
  } as const;

  return { attr, targetType, value, source: src };
}

/**
 * 递归遍历对象，抽取所有名为 `modifiers` 的字段
 */
function collectModifiersFromObject(
  root: CharacterWithRelations,
  fallbackSource: { id: string; name: string; type: SourceType },
): NormalizedModifier[] {
  const out: NormalizedModifier[] = [];

  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;

    // 命中 modifiers 字段
    const mods = (node as any).modifiers;
    if (mods) {
      if (Array.isArray(mods)) {
        for (const m of mods) {
          const nm = normalizeModifier(m, fallbackSource);
          if (nm) out.push(nm);
        }
      } else if (typeof mods === "object") {
        for (const [k, v] of Object.entries(mods)) {
          // 支持形如 { atk: { fixed: 10, percent: 5 } }
          if (v && typeof v === "object") {
            const { fixed, percent, base } = v as any;
            if (Number.isFinite(fixed)) {
              const nm = normalizeModifier({ attr: k, value: Number(fixed), targetType: "fixed" }, fallbackSource);
              if (nm) out.push(nm);
            }
            if (Number.isFinite(percent)) {
              const nm = normalizeModifier({ attr: k, value: Number(percent), targetType: "percent" }, fallbackSource);
              if (nm) out.push(nm);
            }
            if (Number.isFinite(base)) {
              const nm = normalizeModifier({ attr: k, value: Number(base), targetType: "base" }, fallbackSource);
              if (nm) out.push(nm);
            }
          } else if (Number.isFinite(v as any)) {
            // 简单形式 { atk: 10 } 视为固定值
            const nm = normalizeModifier({ attr: k, value: Number(v), targetType: "fixed" }, fallbackSource);
            if (nm) out.push(nm);
          }
        }
      }
    }

    for (const val of Object.values(node)) visit(val);
  };

  visit(root);
  return out;
}

/**
 * 收集并应用战前常驻 modifiers（装备 + 被动技能）到 ReactiveSystem
 */
export function applyPrebattleModifiers(rs: ReactiveSystem<any>, memberData: MemberWithRelations): void {
  const character = memberData.player!.character;

  // 1) 装备 modifiers：从 character 节点深度检索名为 modifiers 的字段
  const equipSource = { id: `equipment:${character.id ?? "unknown"}`, name: "装备", type: "equipment" as const };
  const equipMods = collectModifiersFromObject(character, equipSource);

  // 2) 被动技能 modifiers：遍历 character.skills[*].template（若标记 isPassive 或自带 modifiers）
  const passiveMods: NormalizedModifier[] = [];
  const skills: any[] = Array.isArray(character.skills) ? character.skills : [];
  for (const s of skills) {
    const tpl = s?.template;
    if (!tpl || typeof tpl !== "object") continue;
    const isPassive = Boolean((tpl as any).isPassive ?? (tpl as any).passive);
    if (!isPassive && !tpl.modifiers) continue;

    const src = {
      id: `skill:${tpl.id ?? s?.id ?? "unknown"}`,
      name: String(tpl.name ?? "被动技能"),
      type: "skill" as const,
    };
    const mods = collectModifiersFromObject(tpl, src);
    passiveMods.push(...mods);
  }

  const all = [...equipMods, ...passiveMods];
  for (const m of all) {
    rs.addModifier(m.attr as any, m.targetType, m.value, m.source);
  }
}
