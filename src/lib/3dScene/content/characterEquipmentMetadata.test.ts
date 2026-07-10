import assert from "node:assert/strict";
import { test } from "vitest";
import { readCharacterEquipmentSlotMetadata } from "./characterEquipmentMetadata";

test("读取 mesh 自身的 glTF equipmentSlot extras", () => {
	assert.equal(
		readCharacterEquipmentSlotMetadata({ metadata: { gltf: { extras: { equipmentSlot: "weapon" } } } }),
		"weapon",
	);
});

test("子 mesh 可以继承祖先 node 的 equipmentSlot extras", () => {
	const parent = { metadata: { gltf: { extras: { equipmentSlot: "armor" } } } };
	assert.equal(readCharacterEquipmentSlotMetadata({ parent }), "armor");
});

test("未知槽位、缺失 metadata 和循环 parent 都不会产生拾取语义", () => {
	assert.equal(
		readCharacterEquipmentSlotMetadata({ metadata: { gltf: { extras: { equipmentSlot: "leftHand" } } } }),
		null,
	);
	assert.equal(readCharacterEquipmentSlotMetadata({}), null);
	const cyclic: Record<string, unknown> = {};
	cyclic.parent = cyclic;
	assert.equal(readCharacterEquipmentSlotMetadata(cyclic), null);
});
