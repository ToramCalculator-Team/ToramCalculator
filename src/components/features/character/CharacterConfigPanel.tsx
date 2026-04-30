import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { character, DB } from "@db/generated/zod";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { AbilityPanel } from "./AbilityPanel";
import { BasePanel } from "./BasePanel";
import { EquipmentPanel } from "./EquipmentPanel";
import { SkillPanel } from "./SkillPanel";

export type CharacterConfigPanelProps = {
	character: CharacterWithRelations;
	onPatchRequested: (patch: Partial<character>) => Promise<void>;
	onDebouncedPatchRequested: (patch: Partial<character>, debounceMs?: number) => void;
	onItemPreviewRequested: (type: keyof DB, data: unknown) => void;
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
	const [activeTab, setActiveTab] = createSignal<CharacterConfigTab>("skill");

	return (
		<>
			<OverlayScrollbarsComponent
				element="div"
				options={{ scrollbars: { visibility: "hidden" } }}
				defer
				class="flex-none portrait:w-full landscape:w-fit"
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
			<div class="Divider landscape:bg-dividing-color flex-none portrait:h-6 portrait:w-full landscape:mx-2 landscape:h-full landscape:w-px"></div>
			<OverlayScrollbarsComponent
				element="div"
				options={{ scrollbars: { autoHide: "scroll" } }}
				defer
				class="ConfigPannel w-full h-full landscape:basis-1/2"
			>
				<div class="Config flex flex-col w-full h-full">
					<Show when={activeTab() === "equipment"}>
						<EquipmentPanel
							character={props.character}
							onPatchRequested={props.onPatchRequested}
							onItemPreviewRequested={props.onItemPreviewRequested}
						/>
					</Show>
					<Show when={activeTab() === "base"}>
						<BasePanel name={props.character.name} onPatchRequested={props.onPatchRequested} />
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
							onChangeRequested={(slot, value) => {
								const patch = { [slot]: value } as Partial<character>;
								if (typeof value === "number") {
									props.onDebouncedPatchRequested(patch);
									return;
								}
								void props.onPatchRequested(patch);
							}}
						/>
					</Show>
					<Show when={activeTab() === "skill"}>
						<SkillPanel characterId={props.character.id} skills={props.character.skills} />
					</Show>
				</div>
			</OverlayScrollbarsComponent>
		</>
	);
}
