import assert from "node:assert/strict";
import { test } from "vitest";
import { createActor, createMachine } from "xstate";
import {
	createEditCharacterEquipmentEvent,
	createInspectCharacterEquipmentEvent,
	createInterfaceStateMachine,
	selectCharacterEquipmentInteraction,
} from "./interfaceStateMachine";

const createTestInterfaceMachine = () =>
	createInterfaceStateMachine({ simulatorSession: createMachine({}), characterSession: createMachine({}) });

test("character 装备状态路径只保存模式与动态目标", () => {
	const actor = createActor(createTestInterfaceMachine());
	actor.start();

	assert.equal(actor.getSnapshot().matches({ workspace: "idle" }), true);
	actor.send({ type: "character.open", characterId: "char-1" });
	assert.equal(actor.getSnapshot().matches({ workspace: { character: "overview" } }), true);

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
	assert.equal(actor.getSnapshot().matches({ workspace: { character: "overview" } }), true);
	assert.equal(actor.getSnapshot().context.equipmentSlot, null);
});

test("其他角色的迟到事件不能改变当前 character 状态", () => {
	const actor = createActor(createTestInterfaceMachine());
	actor.start();
	actor.send({ type: "character.open", characterId: "char-1" });
	actor.send(createInspectCharacterEquipmentEvent("char-2", "armor"));

	assert.equal(actor.getSnapshot().matches({ workspace: { character: "overview" } }), true);
	assert.deepEqual(actor.getSnapshot().context, { characterId: "char-1", equipmentSlot: null, simulatorId: null });

	actor.send({ type: "character.close", characterId: "char-2" });
	assert.equal(actor.getSnapshot().matches({ workspace: { character: "overview" } }), true);

	actor.send({ type: "character.close", characterId: "char-1" });
	assert.equal(actor.getSnapshot().matches({ workspace: "idle" }), true);
	assert.deepEqual(actor.getSnapshot().context, { characterId: null, equipmentSlot: null, simulatorId: null });
});

test("打开新角色会回到 overview 并清除旧装备目标", () => {
	const actor = createActor(createTestInterfaceMachine());
	actor.start();
	actor.send({ type: "character.open", characterId: "char-1" });
	actor.send(createEditCharacterEquipmentEvent("char-1", "special"));
	actor.send({ type: "character.open", characterId: "char-2" });

	assert.equal(actor.getSnapshot().matches({ workspace: { character: "overview" } }), true);
	assert.deepEqual(actor.getSnapshot().context, { characterId: "char-2", equipmentSlot: null, simulatorId: null });
});

test("Simulator 阶段在进入 Character 工作面后仍由并行区域保留", () => {
	const actor = createActor(createTestInterfaceMachine());
	actor.start();
	actor.send({ type: "simulator.session.loaded", simulatorId: "sim-1" });
	actor.send({ type: "simulator.validation.started", simulatorId: "sim-1" });
	actor.send({ type: "character.open", characterId: "char-1" });

	assert.equal(actor.getSnapshot().matches({ simulator: "validating" }), true);
	assert.equal(actor.getSnapshot().matches({ workspace: { character: "overview" } }), true);

	actor.send({ type: "simulator.validation.finished", simulatorId: "sim-1", runId: "run-1" });
	assert.equal(actor.getSnapshot().matches({ simulator: "analyzing" }), true);
	actor.send({ type: "simulator.validation.returnedToDesign", simulatorId: "other" });
	assert.equal(actor.getSnapshot().matches({ simulator: "analyzing" }), true);
});
