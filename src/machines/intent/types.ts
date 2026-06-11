/**
 * 意图层纯类型。零依赖、零副作用。
 *
 * 见 docs/decisions/0012-intent-first-visual-control.md
 *
 * 意图被正交分解为两个维度，避免事件枚举爆炸：
 * - Target：语义路径，随产品扩展。
 * - Operation：操作强度（检视 vs 操纵）。
 */

/**
 * 装备语义槽名。
 * 刻意不用 DB 外键列名（weaponId 等）——意图层只表达"哪个槽"的语义，
 * 槽名↔列名的映射限制在消费侧（EquipmentPanel），见冲突清单 #8。
 */
export type EquipSlot = "weapon" | "subWeapon" | "armor" | "option" | "special";

/** 意图目标：语义路径。判别联合，随产品扩展词汇。 */
export type Target =
	| { kind: "equipmentSlot"; characterId: string; slot: EquipSlot }
	| { kind: "skillTree"; characterId: string; treeId?: string }
	| { kind: "simEntity"; memberId: string }
	| { kind: "timelineEvent"; eventId: string };

/** 操作强度：inspect 只读检视；engage 主动操纵。 */
export type Operation = "inspect" | "engage";

/** 输入来源标签。回执/降级等逻辑无关来源，仅用于可观测性与未来仲裁。 */
export type IntentSource = "ui" | "scenePick" | "sceneDwell" | "system";

/** Target 的结构相等比较。null 与 null 相等；kind 不同即不等。 */
export function targetEquals(a: Target | null, b: Target | null): boolean {
	if (a === b) return true;
	if (a === null || b === null) return false;
	if (a.kind !== b.kind) return false;
	switch (a.kind) {
		case "equipmentSlot": {
			const other = b as Extract<Target, { kind: "equipmentSlot" }>;
			return a.characterId === other.characterId && a.slot === other.slot;
		}
		case "skillTree": {
			const other = b as Extract<Target, { kind: "skillTree" }>;
			return a.characterId === other.characterId && a.treeId === other.treeId;
		}
		case "simEntity": {
			const other = b as Extract<Target, { kind: "simEntity" }>;
			return a.memberId === other.memberId;
		}
		case "timelineEvent": {
			const other = b as Extract<Target, { kind: "timelineEvent" }>;
			return a.eventId === other.eventId;
		}
	}
}
