/**
 * AUI 行为状态到 SceneRuntime 的唯一投影接线点。
 *
 * 见 docs/decisions/0021-aui-interface-state-machine.md
 */

import { createEffect, onCleanup } from "solid-js";
import { useSceneRuntime } from "~/lib/3dScene/SceneRuntime";
import { useInterfaceActor } from "../AppActorContext";
import { createInspectCharacterEquipmentEvent } from "../interfaceStateMachine";
import { createSceneInterfaceProjection } from "./sceneInterfaceProjection";

export function SceneInterfaceBridge() {
	const interfaceActor = useInterfaceActor();
	const sceneRuntime = useSceneRuntime();

	const createProjection = () =>
		createSceneInterfaceProjection(interfaceActor, {
			highlightEquipmentSlot: (equipmentSlot) => sceneRuntime.highlightCharacterEquipment(equipmentSlot),
		});

	let disposeProjection = createProjection();
	let contentWasReady = sceneRuntime.characterContentReady();
	createEffect(() => {
		const contentReady = sceneRuntime.characterContentReady();
		if (contentReady && !contentWasReady) {
			disposeProjection();
			disposeProjection = createProjection();
		}
		contentWasReady = contentReady;
	});

	const unsubscribePick = sceneRuntime.subscribeCharacterEquipmentPick(({ characterId, equipmentSlot }) => {
		interfaceActor.send(createInspectCharacterEquipmentEvent(characterId, equipmentSlot));
	});
	onCleanup(() => {
		unsubscribePick();
		disposeProjection();
	});

	return null;
}
