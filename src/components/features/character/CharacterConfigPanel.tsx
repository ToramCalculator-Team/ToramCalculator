import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { DB } from "@db/generated/zod";
import type { SkillTreeType } from "@db/schema/enums";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import type {
	CharacterEdit,
	CharacterFieldPatch,
	CharacterNumericField,
} from "~/features/character/edit/characterEditProtocol";
import { AbilityPanel } from "./AbilityPanel";
import { BasePanel } from "./BasePanel";
import { EquipmentPanel } from "./EquipmentPanel";
import { SkillPanel } from "./SkillPanel";

export type CharacterConfigPanelProps = {
	character: CharacterWithRelations;
	onEditRequested: (edit: CharacterEdit) => void;
	onItemPreviewRequested: (type: keyof DB, data: unknown) => void;
	onSkillLevelAdjustRequested: (payload: { templateId: string; delta: -1 | 1 }) => void;
	onSkillTreeRemoveRequested: (treeType: SkillTreeType) => void;
};

export function CharacterConfigPanel(props: CharacterConfigPanelProps) {
	const dictionary = useDictionary();
	const tabs = [
		{ key: "combo", label: () => dictionary().ui.character.tabs.combo, icon: <Icons.Outline.Gamepad /> },
		{
			key: "equipment",
			label: () => dictionary().ui.character.tabs.equipment.selfName,
			icon: <Icons.Outline.Category />,
		},
		{ key: "consumable", label: () => dictionary().ui.character.tabs.consumable, icon: <Icons.Outline.Sale /> },
		{ key: "cooking", label: () => dictionary().ui.character.tabs.cooking, icon: <Icons.Outline.Coupon2 /> },
		{ key: "registlet", label: () => dictionary().ui.character.tabs.registlet, icon: <Icons.Outline.CreditCard /> },
		{ key: "skill", label: () => dictionary().ui.character.tabs.skill.selfName, icon: <Icons.Outline.Scale /> },
		{ key: "ability", label: () => dictionary().ui.character.tabs.ability, icon: <Icons.Outline.Filter /> },
		{ key: "base", label: () => dictionary().ui.character.tabs.base.selfName, icon: <Icons.Outline.Edit /> },
	] as const;
	type CharacterConfigTab = (typeof tabs)[number]["key"];
	const [activeTab, setActiveTab] = createSignal<CharacterConfigTab>("equipment");
	const requestPatch = (patch: CharacterFieldPatch) =>
		props.onEditRequested({ type: "character.fields.update", patch });
	const requestNumericSet = (field: CharacterNumericField, value: number) =>
		props.onEditRequested({ type: "character.numeric.set", field, value });
	const requestNumericAdjust = (field: CharacterNumericField, delta: -1 | 1) =>
		props.onEditRequested({ type: "character.numeric.adjust", field, delta });

	return (
		<div class="flex portrait:flex-col w-full h-full portrait:gap-6">
			<OverlayScrollbarsComponent
				element="div"
				options={{ scrollbars: { visibility: "hidden" } }}
				defer
				class="flex-none portrait:w-full landscape:w-fit py-3 landscape:px-3"
			>
				<div class="flex flex-row items-start gap-2 landscape:flex-col">
					<For each={tabs}>
						{(tab) => (
							<Button
								onClick={() => setActiveTab(tab.key)}
								level={activeTab() === tab.key ? "primary" : "quaternary"}
								icon={tab.icon}
								textAlign="left"
								class="flex-none landscape:w-full"
							>
								{tab.label()}
							</Button>
						)}
					</For>
				</div>
			</OverlayScrollbarsComponent>
			<div class="Divider bg-dividing-color flex-none portrait:hidden landscape:h-full landscape:w-px"></div>
			<OverlayScrollbarsComponent
				element="div"
				options={{ scrollbars: { autoHide: "scroll" } }}
				defer
				class="ConfigPannel w-full h-full landscape:basis-1/2 landscape:p-3"
			>
				<div class="Config flex flex-col w-full h-full">
					<Show when={activeTab() === "equipment"}>
						<EquipmentPanel
							character={props.character}
							onPatchRequested={requestPatch}
							onItemPreviewRequested={props.onItemPreviewRequested}
						/>
					</Show>
					<Show when={activeTab() === "base"}>
						<BasePanel name={props.character.name} onPatchRequested={requestPatch} />
					</Show>
					<Show when={activeTab() === "ability"}>
						<AbilityPanel
							slots={{
								lv: props.character.lv,
								str: props.character.str,
								int: props.character.int,
								vit: props.character.vit,
								agi: props.character.agi,
								dex: props.character.dex,
								personalityType: props.character.personalityType,
								personalityValue: props.character.personalityValue,
							}}
							onNumericSetRequested={requestNumericSet}
							onNumericAdjustRequested={requestNumericAdjust}
							onPersonalityTypeSetRequested={(value) =>
								props.onEditRequested({ type: "character.personality.setType", value })
							}
						/>
					</Show>
					<Show when={activeTab() === "skill"}>
						<SkillPanel
							onSkillLevelAdjustRequested={props.onSkillLevelAdjustRequested}
							onSkillTreeRemoveRequested={props.onSkillTreeRemoveRequested}
							skills={props.character.skills}
						/>
					</Show>
				</div>
			</OverlayScrollbarsComponent>
		</div>
	);
}
