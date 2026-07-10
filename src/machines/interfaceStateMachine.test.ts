import assert from "node:assert/strict";
import { test } from "vitest";
import { createActor } from "xstate";
import {
	createEditCharacterEquipmentEvent,
	createInspectCharacterEquipmentEvent,
	createInterfaceStateMachine,
	selectCharacterEquipmentInteraction,
} from "./interfaceStateMachine";

test("character 装备状态路径只保存模式与动态目标", () => {
	const actor = createActor(createInterfaceStateMachine());
	actor.start();

	assert.equal(actor.getSnapshot().value, "idle");
	actor.send({ type: "character.open", characterId: "char-1" });
	assert.equal(actor.getSnapshot().matches({ character: "overview" }), true);

	actor.send(createInspectCharacterEquipmentEvent("char-1", "weapon"));
	assert.deepEqual(selectCharacterEquipmentInteraction(actor.getSnapshot()), {
		mode: "inspecting",
		characterId: "char-1",
		equipmentSlot: "weapon",
	});

	actor.send(createEditCharacterEquipmentEvent("char-1", "weapon"));
	assert.deepEqual(selectCharacterEquipmentInteraction(actor.getSnapshot()), {
		mode: "editing",
		characterId: "char-1",
		equipmentSlot: "weapon",
	});

	actor.send({ type: "character.overview", characterId: "char-1" });
	assert.equal(actor.getSnapshot().matches({ character: "overview" }), true);
	assert.equal(actor.getSnapshot().context.equipmentSlot, null);
});

test("其他角色的迟到事件不能改变当前 character 状态", () => {
	const actor = createActor(createInterfaceStateMachine());
	actor.start();
	actor.send({ type: "character.open", characterId: "char-1" });
	actor.send(createInspectCharacterEquipmentEvent("char-2", "armor"));

	assert.equal(actor.getSnapshot().matches({ character: "overview" }), true);
	assert.deepEqual(actor.getSnapshot().context, { characterId: "char-1", equipmentSlot: null });

	actor.send({ type: "character.close", characterId: "char-2" });
	assert.equal(actor.getSnapshot().matches({ character: "overview" }), true);

	actor.send({ type: "character.close", characterId: "char-1" });
	assert.equal(actor.getSnapshot().value, "idle");
	assert.deepEqual(actor.getSnapshot().context, { characterId: null, equipmentSlot: null });
});

test("打开新角色会回到 overview 并清除旧装备目标", () => {
	const actor = createActor(createInterfaceStateMachine());
	actor.start();
	actor.send({ type: "character.open", characterId: "char-1" });
	actor.send(createEditCharacterEquipmentEvent("char-1", "special"));
	actor.send({ type: "character.open", characterId: "char-2" });

	assert.equal(actor.getSnapshot().matches({ character: "overview" }), true);
	assert.deepEqual(actor.getSnapshot().context, { characterId: "char-2", equipmentSlot: null });
});
