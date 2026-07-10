/**
 * AUI 行为状态机：只持有跨 2D UI 与 3D 场景共享的交互语义。
 *
 * 见 docs/decisions/0021-aui-interface-state-machine.md
 *
 * 当前只落地 character 装备薄切片。状态路径表达行为模式，context 只保存动态目标；
 * overlay、相机补间和领域实体仍由各自投影或领域模块管理。
 */

import { type ActorRefFrom, assign, type SnapshotFrom, setup } from "xstate";
import type { CharacterEquipmentSlot } from "~/shared/interaction/characterEquipment";

export type { CharacterEquipmentSlot } from "~/shared/interaction/characterEquipment";

export type InterfaceStateContext = {
	characterId: string | null;
	equipmentSlot: CharacterEquipmentSlot | null;
};

export type InterfaceStateEvent =
	| { type: "character.open"; characterId: string }
	| { type: "character.close"; characterId: string }
	| { type: "character.overview"; characterId: string }
	| { type: "character.equipment.inspect"; characterId: string; equipmentSlot: CharacterEquipmentSlot }
	| { type: "character.equipment.edit"; characterId: string; equipmentSlot: CharacterEquipmentSlot };

export type CharacterEquipmentInteraction = {
	mode: "inspecting" | "editing";
	characterId: string;
	equipmentSlot: CharacterEquipmentSlot;
};

export const createInspectCharacterEquipmentEvent = (
	characterId: string,
	equipmentSlot: CharacterEquipmentSlot,
): InterfaceStateEvent => ({
	type: "character.equipment.inspect",
	characterId,
	equipmentSlot,
});

export const createEditCharacterEquipmentEvent = (
	characterId: string,
	equipmentSlot: CharacterEquipmentSlot,
): InterfaceStateEvent => ({
	type: "character.equipment.edit",
	characterId,
	equipmentSlot,
});

export const createInterfaceStateMachine = () => {
	const machineSetup = setup({
		types: {
			context: {} as InterfaceStateContext,
			events: {} as InterfaceStateEvent,
		},
		guards: {
			opensDifferentCharacter: ({ context, event }) =>
				event.type === "character.open" && context.characterId !== event.characterId,
			targetsCurrentCharacter: ({ context, event }) => context.characterId === event.characterId,
		},
		actions: {
			setCharacter: assign(({ event }) =>
				event.type === "character.open"
					? { characterId: event.characterId, equipmentSlot: null }
					: { characterId: null, equipmentSlot: null },
			),
			setEquipmentTarget: assign(({ event }) =>
				event.type === "character.equipment.inspect" || event.type === "character.equipment.edit"
					? { characterId: event.characterId, equipmentSlot: event.equipmentSlot }
					: {},
			),
			clearEquipmentTarget: assign({ equipmentSlot: () => null }),
			clearCharacter: assign({ characterId: () => null, equipmentSlot: () => null }),
		},
	});

	return machineSetup.createMachine({
		id: "interfaceState",
		initial: "idle",
		context: { characterId: null, equipmentSlot: null },
		on: {
			"character.open": {
				guard: "opensDifferentCharacter",
				target: ".character.overview",
				actions: "setCharacter",
			},
			"character.close": {
				guard: "targetsCurrentCharacter",
				target: ".idle",
				actions: "clearCharacter",
			},
			"character.overview": {
				guard: "targetsCurrentCharacter",
				target: ".character.overview",
				actions: "clearEquipmentTarget",
			},
			"character.equipment.inspect": {
				guard: "targetsCurrentCharacter",
				target: ".character.equipment.inspecting",
				actions: "setEquipmentTarget",
			},
			"character.equipment.edit": {
				guard: "targetsCurrentCharacter",
				target: ".character.equipment.editing",
				actions: "setEquipmentTarget",
			},
		},
		states: {
			idle: {},
			character: {
				initial: "overview",
				states: {
					overview: {},
					equipment: {
						initial: "inspecting",
						states: {
							inspecting: {},
							editing: {},
						},
					},
				},
			},
		},
	});
};

export type InterfaceStateMachine = ReturnType<typeof createInterfaceStateMachine>;
export type InterfaceStateActorRef = ActorRefFrom<InterfaceStateMachine>;
export type InterfaceStateSnapshot = SnapshotFrom<InterfaceStateMachine>;

/**
 * 从 AUI snapshot 读取装备交互投影；context 不完整时返回 null，让错误状态保持不可见。
 * UI 高亮、sheet 与 3D 相机共用这一读取规则，避免各自解释状态路径。
 */
export function selectCharacterEquipmentInteraction(
	snapshot: InterfaceStateSnapshot,
): CharacterEquipmentInteraction | null {
	const mode = snapshot.matches({ character: { equipment: "editing" } })
		? "editing"
		: snapshot.matches({ character: { equipment: "inspecting" } })
			? "inspecting"
			: null;
	if (!mode || !snapshot.context.characterId || !snapshot.context.equipmentSlot) return null;
	return {
		mode,
		characterId: snapshot.context.characterId,
		equipmentSlot: snapshot.context.equipmentSlot,
	};
}
