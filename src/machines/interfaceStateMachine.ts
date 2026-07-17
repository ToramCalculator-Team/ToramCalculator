/**
 * AUI 行为状态机：只持有跨 2D UI 与 3D 场景共享的交互语义。
 *
 * 见 docs/decisions/0021-aui-interface-state-machine.md
 *
 * workspace 与 simulator 会话阶段是并行区域：进入 Character 工作面不会丢失当前
 * Simulator 的 designing/validating/analyzing 阶段。context 只保存动态目标身份；
 * 设计副本、运行记录、overlay 和领域实体仍由各自模块管理。
 */

import { type ActorRefFrom, type AnyActorLogic, assign, type SnapshotFrom, sendTo, setup } from "xstate";
import type { SimulatorSessionParentEvent } from "~/features/simulator/simulatorSessionProtocol";
import type { CharacterEquipmentSlot } from "~/machines/interface/characterEquipment";

export type { CharacterEquipmentSlot } from "~/machines/interface/characterEquipment";

export type InterfaceStateContext = {
	characterId: string | null;
	equipmentSlot: CharacterEquipmentSlot | null;
	simulatorId: string | null;
};

export type InterfaceStateEvent =
	| { type: "character.open"; characterId: string }
	| { type: "character.close"; characterId: string }
	| { type: "character.overview"; characterId: string }
	| { type: "character.equipment.inspect"; characterId: string; equipmentSlot: CharacterEquipmentSlot }
	| { type: "character.equipment.edit"; characterId: string; equipmentSlot: CharacterEquipmentSlot }
	| SimulatorSessionParentEvent;

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

export type ApplicationSessionLogics = {
	simulatorSession: AnyActorLogic;
	characterSession: AnyActorLogic;
};

export const createInterfaceStateMachine = (sessionLogics: ApplicationSessionLogics) => {
	const machineSetup = setup({
		types: {
			context: {} as InterfaceStateContext,
			events: {} as InterfaceStateEvent,
		},
		guards: {
			opensDifferentCharacter: ({ context, event }) =>
				event.type === "character.open" && context.characterId !== event.characterId,
			targetsCurrentCharacter: ({ context, event }) =>
				"characterId" in event && context.characterId === event.characterId,
			targetsCurrentSimulator: ({ context, event }) =>
				"simulatorId" in event && context.simulatorId === event.simulatorId,
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
			clearSimulator: assign({ simulatorId: () => null }),
			authorizeSessionSwitch: sendTo("simulatorSession", { type: "session.switch.authorized" }),
			authorizeSessionEnd: sendTo("simulatorSession", { type: "session.end.authorized" }),
			authorizeValidationStart: sendTo("simulatorSession", { type: "validation.start.authorized" }),
			authorizeValidationFinish: sendTo("simulatorSession", { type: "validation.finish.authorized" }),
			authorizeReturnToDesign: sendTo("simulatorSession", { type: "validation.returnToDesign.authorized" }),
			denySessionSwitch: sendTo("simulatorSession", {
				type: "session.switch.denied",
				reason: "AUI 当前状态不允许切换 Simulator",
			}),
			denySessionEnd: sendTo("simulatorSession", {
				type: "session.end.denied",
				reason: "AUI 当前状态不允许结束 SimulatorSession",
			}),
			denyValidationStart: sendTo("simulatorSession", {
				type: "validation.start.denied",
				reason: "AUI 当前阶段不允许开始验证",
			}),
			denyValidationFinish: sendTo("simulatorSession", {
				type: "validation.finish.denied",
				reason: "AUI 当前阶段不允许结束验证",
			}),
			denyReturnToDesign: sendTo("simulatorSession", {
				type: "validation.returnToDesign.denied",
				reason: "AUI 当前阶段不允许返回设计",
			}),
		},
		actors: sessionLogics,
	});

	return machineSetup.createMachine({
		id: "interfaceState",
		type: "parallel",
		context: { characterId: null, equipmentSlot: null, simulatorId: null },
		invoke: [
			{
				id: "simulatorSession",
				systemId: "simulatorSession",
				src: "simulatorSession",
			},
			{
				id: "characterSession",
				systemId: "characterSession",
				src: "characterSession",
			},
		],
		on: {
			"simulator.session.switch.proposed": { actions: "denySessionSwitch" },
			"simulator.session.end.proposed": { actions: "denySessionEnd" },
			"simulator.validation.start.proposed": { actions: "denyValidationStart" },
			"simulator.validation.finish.proposed": { actions: "denyValidationFinish" },
			"simulator.validation.returnToDesign.proposed": { actions: "denyReturnToDesign" },
		},
		states: {
			workspace: {
				initial: "idle",
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
			},
			simulator: {
				initial: "inactive",
				on: {
					"simulator.session.loaded": {
						target: ".designing",
						actions: assign(({ event }) => ({ simulatorId: event.simulatorId })),
					},
					"simulator.session.switch.proposed": {
						actions: "authorizeSessionSwitch",
					},
					"simulator.session.switched": {
						target: ".designing",
						actions: assign(({ event }) => ({ simulatorId: event.simulatorId })),
					},
					"simulator.session.end.proposed": {
						guard: "targetsCurrentSimulator",
						actions: "authorizeSessionEnd",
					},
					"simulator.session.ended": {
						guard: "targetsCurrentSimulator",
						target: ".inactive",
						actions: "clearSimulator",
					},
				},
				states: {
					inactive: {},
					designing: {
						on: {
							"simulator.validation.start.proposed": {
								guard: "targetsCurrentSimulator",
								actions: "authorizeValidationStart",
							},
							"simulator.validation.started": {
								guard: "targetsCurrentSimulator",
								target: "validating",
							},
						},
					},
					validating: {
						on: {
							"simulator.validation.finish.proposed": {
								guard: "targetsCurrentSimulator",
								actions: "authorizeValidationFinish",
							},
							"simulator.validation.finished": {
								guard: "targetsCurrentSimulator",
								target: "analyzing",
							},
							"simulator.validation.returnToDesign.proposed": {
								guard: "targetsCurrentSimulator",
								actions: "authorizeReturnToDesign",
							},
							"simulator.validation.returnedToDesign": {
								guard: "targetsCurrentSimulator",
								target: "designing",
							},
						},
					},
					analyzing: {
						on: {
							"simulator.validation.returnToDesign.proposed": {
								guard: "targetsCurrentSimulator",
								actions: "authorizeReturnToDesign",
							},
							"simulator.validation.returnedToDesign": {
								guard: "targetsCurrentSimulator",
								target: "designing",
							},
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
	const mode = snapshot.matches({ workspace: { character: { equipment: "editing" } } })
		? "editing"
		: snapshot.matches({ workspace: { character: { equipment: "inspecting" } } })
			? "inspecting"
			: null;
	if (!mode || !snapshot.context.characterId || !snapshot.context.equipmentSlot) return null;
	return {
		mode,
		characterId: snapshot.context.characterId,
		equipmentSlot: snapshot.context.equipmentSlot,
	};
}
