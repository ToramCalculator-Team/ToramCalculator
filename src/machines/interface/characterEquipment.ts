/** character 装备槽的跨层语义词汇；数据库列名和 3D 节点名不得进入该联合。 */
export const CHARACTER_EQUIPMENT_SLOTS = ["weapon", "subWeapon", "armor", "option", "special"] as const;

export type CharacterEquipmentSlot = (typeof CHARACTER_EQUIPMENT_SLOTS)[number];

export function isCharacterEquipmentSlot(value: unknown): value is CharacterEquipmentSlot {
	return typeof value === "string" && CHARACTER_EQUIPMENT_SLOTS.some((slot) => slot === value);
}
