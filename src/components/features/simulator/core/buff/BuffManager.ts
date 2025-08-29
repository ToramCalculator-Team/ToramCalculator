import type { Member } from "../member/Member";
import { ModifierType } from "../dataSys/ReactiveSystem";

export type StackRule = "stack" | "refresh" | "replace";

export type BuffModifier = {
  attr: string;
  kind:
    | ModifierType.BASE_VALUE
    | ModifierType.STATIC_FIXED
    | ModifierType.STATIC_PERCENTAGE
    | ModifierType.DYNAMIC_FIXED
    | ModifierType.DYNAMIC_PERCENTAGE;
  value: number;
};

export type BuffHooks = {
  onResourceSpendAttempt?: (
    ctx: any,
    plan: { hp?: number; mp?: number; [k: string]: number | undefined },
  ) => Partial<{ hp: number; mp: number }> | void;
  onBeforeDamage?: (
    ctx: any,
    io: { mul?: number; add?: number; flags?: { invul?: boolean } },
  ) => Partial<{ mul: number; add: number; flags: { invul?: boolean } }> | void;
  onAfterDamage?: (
    ctx: any,
    io: { final?: number },
  ) => Partial<{ final: number }> | void;
  onApplyDamage?: (
    ctx: any,
    io: { applied?: number },
  ) => Partial<{ applied: number }> | void;
};

export interface BuffInstance {
  id: string;
  name: string;
  source: { id: string; name: string; type: "skill" | "item" | "system" };
  stacks: number;
  stackRule: StackRule;
  startFrame: number;
  endFrame?: number;
  modifiers?: BuffModifier[];
  hooks?: BuffHooks;
  // runtime
  nextTickFrame?: number;
}

/**
 * 轻量 BuffManager：
 * - 管理 buff 生命周期（仅到期移除）
 * - 将修饰落入/撤出 StatContainer（ReactiveSystem）
 * - 提供钩子聚合 API 给同步流水线调用
 * - 提供 mechanicState（成员私有机制状态）存取
 */
export class BuffManager {
  private readonly member: Member<any>;
  private readonly active: Map<string, BuffInstance> = new Map();
  private readonly mechanicState: Map<string, number> = new Map();

  constructor(member: Member<any>) {
    this.member = member;
  }

  // ======== Mechanic State ========
  getMech(key: string): number {
    return this.mechanicState.get(key) ?? 0;
  }
  setMech(key: string, value: number): void {
    this.mechanicState.set(key, value);
  }
  incMech(key: string, delta = 1): number {
    const v = (this.mechanicState.get(key) ?? 0) + delta;
    this.mechanicState.set(key, v);
    return v;
  }
  consumeMech(key: string, amount: number): number {
    const cur = this.mechanicState.get(key) ?? 0;
    const used = Math.min(cur, amount);
    this.mechanicState.set(key, cur - used);
    return used;
  }

  // ======== Lifecycle ========
  apply(buff: BuffInstance): void {
    // stacking policy
    const existing = this.active.get(buff.id);
    if (existing) {
      switch (buff.stackRule) {
        case "stack":
          existing.stacks += buff.stacks;
          break;
        case "refresh":
          existing.endFrame = buff.endFrame ?? existing.endFrame;
          break;
        case "replace":
          this.remove(existing.id);
          this.active.set(buff.id, buff);
          this.applyModifiers(buff);
          return;
      }
      // re-apply modifiers according to new stacks (simple: remove old then add new)
      this.removeModifiers(existing);
      if (existing.modifiers && existing.modifiers.length > 0) {
        this.applyModifiers(existing);
      }
      return;
    }

    this.active.set(buff.id, buff);
    this.applyModifiers(buff);
  }

  remove(buffId: string): void {
    const b = this.active.get(buffId);
    if (!b) return;
    this.removeModifiers(b);
    this.active.delete(buffId);
  }

  update(currentFrame: number): void {
    // minimal: handle expire only (periodic could be added later via events)
    for (const [id, b] of [...this.active.entries()]) {
      if (b.endFrame !== undefined && currentFrame >= b.endFrame) {
        this.remove(id);
      }
    }
  }

  // ======== Hooks Aggregation ========
  applyResourceSpendAttempt(ctx: any, plan: { hp?: number; mp?: number; [k: string]: number | undefined }): void {
    for (const b of this.active.values()) {
      const delta = b.hooks?.onResourceSpendAttempt?.(ctx, plan);
      if (delta) {
        if (typeof delta.hp === "number") plan.hp = delta.hp;
        if (typeof delta.mp === "number") plan.mp = delta.mp;
      }
    }
  }

  applyBeforeDamage(ctx: any, io: { mul?: number; add?: number; flags?: { invul?: boolean } }): void {
    for (const b of this.active.values()) {
      const d = b.hooks?.onBeforeDamage?.(ctx, io);
      if (d) {
        if (typeof d.mul === "number") io.mul = (io.mul ?? 1) * d.mul;
        if (typeof d.add === "number") io.add = (io.add ?? 0) + d.add;
        if (d.flags?.invul) io.flags = { ...(io.flags ?? {}), invul: true };
      }
    }
  }

  applyAfterDamage(ctx: any, io: { final?: number }): void {
    for (const b of this.active.values()) {
      const d = b.hooks?.onAfterDamage?.(ctx, io);
      if (d && typeof d.final === "number") io.final = d.final;
    }
  }

  applyApplyDamage(ctx: any, io: { applied?: number }): void {
    for (const b of this.active.values()) {
      const d = b.hooks?.onApplyDamage?.(ctx, io);
      if (d && typeof d.applied === "number") io.applied = d.applied;
    }
  }

  // ======== Internal: RS bridge ========
  private applyModifiers(buff: BuffInstance): void {
    if (!buff.modifiers || buff.modifiers.length === 0) return;
    for (const m of buff.modifiers) {
      this.member.rs.addModifier(m.attr as any, m.kind, m.value, {
        id: this.sourceId(buff, m.attr),
        name: buff.name,
        type: "buff",
      });
    }
  }
  private removeModifiers(buff: BuffInstance): void {
    if (!buff.modifiers || buff.modifiers.length === 0) return;
    for (const m of buff.modifiers) {
      this.member.rs.removeModifier(m.attr as any, m.kind, this.sourceKey(buff, m.attr));
    }
  }
  private sourceId(buff: BuffInstance, attr: string): { id: string; name: string; type: "buff" } {
    return { id: this.sourceKey(buff, attr), name: buff.name, type: "buff" };
  }
  private sourceKey(buff: BuffInstance, attr: string): string {
    return `buff:${buff.id}:${attr}`;
  }
}

export default BuffManager;

