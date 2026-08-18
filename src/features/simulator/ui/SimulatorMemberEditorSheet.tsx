import type { CharacterWithRelations } from "@db/generated/repositories/character";
import { selectPlayerArmorByIdWithRelationsQuery } from "@db/generated/repositories/player_armor";
import { selectPlayerOptionByIdWithRelationsQuery } from "@db/generated/repositories/player_option";
import { selectPlayerSpecialByIdWithRelationsQuery } from "@db/generated/repositories/player_special";
import { selectPlayerWeaponByIdWithRelationsQuery } from "@db/generated/repositories/player_weapon";
import { selectSkillByIdWithRelationsQuery } from "@db/generated/repositories/skill";
import { getDB } from "@db/repositories/database";
import type { CharacterPersonalityType } from "@db/schema/enums";
import { createId } from "@paralleldrive/cuid2";
import { createSignal, Show } from "solid-js";
import { unwrap } from "solid-js/store";
import { Button } from "~/components/ui/controls/button";
import { Icons } from "~/components/ui/icons";
import type {
	CharacterEdit,
	CharacterFieldPatch,
	CharacterNumericField,
} from "~/features/character/edit/characterEditProtocol";
import {
	adjustCharacterNumericValue,
	normalizeCharacterNumericValue,
	normalizePersonalityTypeChange,
} from "~/features/character/edit/characterNumericRules";
import { CharacterConfigPanel } from "~/features/character/ui/CharacterConfigPanel";
import type { EquipmentSlot } from "~/features/character/ui/EquipmentPanel";
import type { SimulationDesignMember, SimulatorCharacter } from "~/features/simulator/data/simulationDesignSchema";

type Props = {
	member: SimulationDesignMember;
	onSave: (character: SimulatorCharacter) => void;
	onClose: () => void;
};

const equipmentRelation: Record<EquipmentSlot, "weapon" | "subWeapon" | "armor" | "option" | "special"> = {
	weaponId: "weapon",
	subWeaponId: "subWeapon",
	armorId: "armor",
	optionId: "option",
	specialId: "special",
};

/**
 * Simulator 机体编辑器只维护本地草稿；完成时一次性把完整机体快照交给 SimulatorSession，
 * 因而关闭或取消不会触发 CharacterSession、数据库写入或技能预览计算。
 */
export function SimulatorMemberEditorSheet(props: Props) {
	const [draft, setDraft] = createSignal<SimulatorCharacter | null>(
		// fromActorRef 的快照由 Solid store 包装；先解除响应式代理，再建立表单自己的可变草稿。
		props.member.character ? structuredClone(unwrap(props.member.character)) : null,
	);
	const [error, setError] = createSignal<string | null>(null);
	// SimulatorCharacter 与 CharacterWithRelations 共享配置面板所需的关系形状；两者的差异只在引擎裁剪字段。
	const characterView = () => draft() as unknown as CharacterWithRelations;

	const close = () => {
		props.onClose();
	};

	const updateDraft = (updater: (current: SimulatorCharacter) => SimulatorCharacter) => {
		setDraft((current) => (current ? updater(current) : current));
	};

	const loadEquipment = async (slot: EquipmentSlot, id: string) => {
		const db = await getDB();
		switch (slot) {
			case "weaponId":
			case "subWeaponId":
				return await selectPlayerWeaponByIdWithRelationsQuery(db, id).executeTakeFirst();
			case "armorId":
				return await selectPlayerArmorByIdWithRelationsQuery(db, id).executeTakeFirst();
			case "optionId":
				return await selectPlayerOptionByIdWithRelationsQuery(db, id).executeTakeFirst();
			case "specialId":
				return await selectPlayerSpecialByIdWithRelationsQuery(db, id).executeTakeFirst();
		}
	};

	const applyFieldPatch = async (patch: CharacterFieldPatch) => {
		const equipmentSlot = (Object.keys(equipmentRelation) as EquipmentSlot[]).find((slot) => slot in patch);
		if (equipmentSlot) {
			const id = patch[equipmentSlot];
			if (id === null || id === undefined) {
				updateDraft((current) => ({
					...current,
					[equipmentSlot]: null,
					[equipmentRelation[equipmentSlot]]: null,
				}));
				return;
			}
			try {
				const equipment = await loadEquipment(equipmentSlot, id);
				if (!equipment) throw new Error(`装备不存在: ${id}`);
				updateDraft((current) => ({
					...current,
					[equipmentSlot]: id,
					[equipmentRelation[equipmentSlot]]: equipment,
				}));
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : String(cause));
			}
			return;
		}
		updateDraft((current) => ({ ...current, ...patch }));
	};

	const setNumeric = (field: CharacterNumericField, value: number) => {
		const current = draft();
		if (!current || !Number.isFinite(value)) return;
		const nextValue = normalizeCharacterNumericValue(field, value, current.personalityType as CharacterPersonalityType);
		updateDraft((next) => ({ ...next, [field]: nextValue }));
	};

	const adjustNumeric = (field: CharacterNumericField, delta: -1 | 1) => {
		const current = draft();
		if (!current) return;
		// SimulatorCharacter 已通过 SimulationDesignSchema 校验，字段集合与 CharacterNumericState 一致。
		const nextValue = adjustCharacterNumericValue(
			current as unknown as Record<CharacterNumericField, number> & { personalityType: CharacterPersonalityType },
			field,
			delta,
		);
		updateDraft((next) => ({ ...next, [field]: nextValue }));
	};

	const applyEdit = (edit: CharacterEdit) => {
		if (edit.type === "character.fields.update") {
			void applyFieldPatch(edit.patch);
			return;
		}
		if (edit.type === "character.numeric.set") {
			setNumeric(edit.field, edit.value);
			return;
		}
		if (edit.type === "character.numeric.adjust") {
			adjustNumeric(edit.field, edit.delta);
			return;
		}
		if (edit.type === "character.personality.setType") {
			const current = draft();
			if (!current) return;
			const next = normalizePersonalityTypeChange(current.personalityValue, edit.value);
			updateDraft((value) => ({ ...value, ...next }));
			return;
		}
		if (edit.type === "skills.removeTree") {
			updateDraft((current) => ({
				...current,
				skills: current.skills.filter((skill) => skill.template.treeType !== edit.treeType),
			}));
		}
	};

	const adjustSkill = async (payload: { templateId: string; delta: -1 | 1 }) => {
		const current = draft();
		if (!current) return;
		const existing = current.skills.find((skill) => skill.templateId === payload.templateId);
		if (existing) {
			updateDraft((value) => ({
				...value,
				skills: value.skills.map((skill) =>
					skill.templateId === payload.templateId
						? { ...skill, lv: Math.max(0, Math.min(10, skill.lv + payload.delta)) }
						: skill,
				),
			}));
			return;
		}
		if (payload.delta < 0) return;
		try {
			const db = await getDB();
			const template = await selectSkillByIdWithRelationsQuery(db, payload.templateId).executeTakeFirst();
			if (!template) throw new Error(`技能模板不存在: ${payload.templateId}`);
			updateDraft((value) => ({
				...value,
				skills: [
					...value.skills,
					{ id: createId(), lv: 1, isStarGem: false, templateId: template.id, belongToCharacterId: value.id, template },
				],
			}));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		}
	};

	return (
		<Show
			when={draft()}
			fallback={<div class="flex h-full items-center justify-center p-6">当前成员没有可编辑的机体配置</div>}
		>
			{(character) => (
				<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
					<header class="border-dividing-color flex flex-none items-center justify-between gap-3 border-b px-6 py-4">
						<div class="min-w-0">
							<strong class="block truncate text-lg">编辑 {props.member.name || character().name}</strong>
							<span class="text-accent-color-70 text-sm">仅修改当前 Simulator 设计副本</span>
						</div>
						<div class="flex flex-none items-center gap-2">
							<Button level="quaternary" onClick={close}>
								取消
							</Button>
							<Button
								level="primary"
								icon={<Icons.Outline.Save />}
								onClick={() => {
									const value = draft();
									if (value) props.onSave(value);
									close();
								}}
							>
								完成
							</Button>
						</div>
					</header>
					<Show when={error()}>
						{(message) => (
							<div class="border-danger-color flex-none border-b px-6 py-2 text-sm text-danger-color">{message()}</div>
						)}
					</Show>
					<div class="min-h-0 flex-1 overflow-y-auto p-6">
						<CharacterConfigPanel
							character={characterView()}
							mode="draft"
							onEditRequested={applyEdit}
							onItemPreviewRequested={() => undefined}
							onSkillLevelAdjustRequested={(payload) => void adjustSkill(payload)}
							onSkillTreeRemoveRequested={(treeType) => applyEdit({ type: "skills.removeTree", treeType })}
						/>
					</div>
				</div>
			)}
		</Show>
	);
}
