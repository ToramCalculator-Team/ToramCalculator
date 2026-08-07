/**
 * character 装备 mesh 的 glTF metadata 读取契约。
 *
 * 资产在可拾取 mesh 或其祖先 node 的 `extras.equipmentSlot` 写入 AUI 装备槽语义。
 * Babylon glTF loader 会把 extras 暴露为 `node.metadata.gltf.extras`；子 mesh 可继承祖先标记。
 */

import { type CharacterEquipmentSlot, isCharacterEquipmentSlot } from "~/machines/interface/characterEquipment";

export const CHARACTER_EQUIPMENT_SLOT_EXTRA = "equipmentSlot";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const readSlotFromNode = (node: Record<string, unknown>): CharacterEquipmentSlot | null => {
	const metadata = node.metadata;
	if (!isRecord(metadata)) return null;
	const gltf = metadata.gltf;
	if (!isRecord(gltf)) return null;
	const extras = gltf.extras;
	if (!isRecord(extras)) return null;
	const slot = extras[CHARACTER_EQUIPMENT_SLOT_EXTRA];
	return isCharacterEquipmentSlot(slot) ? slot : null;
};

/** 从命中 mesh 沿 parent 向上读取首个合法装备槽，并防止异常层级形成循环。 */
export function readCharacterEquipmentSlotMetadata(pickedNode: unknown): CharacterEquipmentSlot | null {
	const visited = new Set<object>();
	let node: unknown = pickedNode;

	while (isRecord(node) && !visited.has(node)) {
		visited.add(node);
		const slot = readSlotFromNode(node);
		if (slot) return slot;
		node = node.parent;
	}

	return null;
}
