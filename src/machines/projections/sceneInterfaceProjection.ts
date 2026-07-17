/**
 * AUI snapshot 到 3D 装备表现的纯投影边界。
 *
 * 见 docs/decisions/0021-aui-interface-state-machine.md
 * 投影只读取 snapshot，不向状态机回传渲染完成事件；唯一局部状态是当前高亮的清理句柄。
 */

import type { CharacterEquipmentSlot } from "~/machines/interface/characterEquipment";
import type { InterfaceStateActorRef } from "../interfaceStateMachine";
import { selectCharacterEquipmentInteraction } from "../interfaceStateMachine";

export type SceneInterfaceProjectionDeps = {
	highlightEquipmentSlot: (equipmentSlot: CharacterEquipmentSlot) => () => void;
};

export function createSceneInterfaceProjection(
	interfaceActor: InterfaceStateActorRef,
	deps: SceneInterfaceProjectionDeps,
): () => void {
	let clearHighlight: (() => void) | null = null;
	let projectedTargetKey: string | null | undefined;

	const cancelCurrent = () => {
		clearHighlight?.();
		clearHighlight = null;
	};

	const project = (snapshot: ReturnType<InterfaceStateActorRef["getSnapshot"]>) => {
		const interaction = selectCharacterEquipmentInteraction(snapshot);
		const targetKey = interaction ? `${interaction.characterId}:${interaction.equipmentSlot}` : null;
		if (targetKey === projectedTargetKey) return;

		projectedTargetKey = targetKey;
		cancelCurrent();

		if (interaction) {
			clearHighlight = deps.highlightEquipmentSlot(interaction.equipmentSlot);
		}
	};

	// 先投影当前快照，确保组件重挂载不依赖历史事件重放。
	project(interfaceActor.getSnapshot());
	const subscription = interfaceActor.subscribe(project);

	return () => {
		subscription.unsubscribe();
		cancelCurrent();
	};
}
