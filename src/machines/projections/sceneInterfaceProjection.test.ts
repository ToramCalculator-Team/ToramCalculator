import assert from "node:assert/strict";
import { test } from "vitest";
import { createActor, createMachine } from "xstate";
import {
	createEditCharacterEquipmentEvent,
	createInspectCharacterEquipmentEvent,
	createInterfaceStateMachine,
} from "../interfaceStateMachine";
import { createSceneInterfaceProjection } from "./sceneInterfaceProjection";

const createTestInterfaceMachine = () =>
	createInterfaceStateMachine({ simulatorSession: createMachine({}), characterSession: createMachine({}) });

test("场景只从 snapshot 投影装备高亮，editing 不重复创建投影", () => {
	const actor = createActor(createTestInterfaceMachine());
	actor.start();
	actor.send({ type: "character.open", characterId: "char-1" });

	const calls: string[] = [];
	const dispose = createSceneInterfaceProjection(actor, {
		highlightEquipmentSlot: (slot) => {
			calls.push(`highlight:${slot}`);
			return () => calls.push(`clear:${slot}`);
		},
	});

	actor.send(createInspectCharacterEquipmentEvent("char-1", "weapon"));
	actor.send(createEditCharacterEquipmentEvent("char-1", "weapon"));
	assert.deepEqual(calls, ["highlight:weapon"]);

	actor.send(createInspectCharacterEquipmentEvent("char-1", "armor"));
	assert.deepEqual(calls, ["highlight:weapon", "clear:weapon", "highlight:armor"]);

	actor.send({ type: "character.overview", characterId: "char-1" });
	assert.deepEqual(calls, ["highlight:weapon", "clear:weapon", "highlight:armor", "clear:armor"]);

	dispose();
	assert.equal(calls.at(-1), "clear:armor");
});

test("场景投影重挂载时仅凭当前 snapshot 恢复装备目标", () => {
	const actor = createActor(createTestInterfaceMachine());
	actor.start();
	actor.send({ type: "character.open", characterId: "char-1" });
	actor.send(createInspectCharacterEquipmentEvent("char-1", "special"));

	const calls: string[] = [];
	const dispose = createSceneInterfaceProjection(actor, {
		highlightEquipmentSlot: (slot) => {
			calls.push(`highlight:${slot}`);
			return () => {};
		},
	});

	assert.deepEqual(calls, ["highlight:special"]);
	dispose();
});
