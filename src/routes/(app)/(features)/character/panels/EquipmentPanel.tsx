import type { PlayerArmorWithRelations } from "@db/generated/repositories/player_armor";
import type { PlayerOptionWithRelations } from "@db/generated/repositories/player_option";
import type { PlayerSpecialWithRelations } from "@db/generated/repositories/player_special";
import type { PlayerWeaponWithRelations } from "@db/generated/repositories/player_weapon";
import { Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";

export type EquipmentSlot = "mainHand" | "subHand" | "armor" | "additional" | "special";

type EquipmentPanelProps = {
	slots: {
		mainHand: PlayerWeaponWithRelations | null;
		subHand: PlayerWeaponWithRelations | null;
		armor: PlayerArmorWithRelations | null;
		additional: PlayerOptionWithRelations | null;
		special: PlayerSpecialWithRelations | null;
	};
	onPickRequested: (slot: EquipmentSlot) => void;
	onClearRequested: (slot: EquipmentSlot) => void;
	onItemPreviewRequested: (slot: EquipmentSlot, item: PlayerWeaponWithRelations | PlayerArmorWithRelations | PlayerOptionWithRelations | PlayerSpecialWithRelations) => void;
};

export function EquipmentPanel(props: EquipmentPanelProps) {
	const dictionary = useDictionary();
	return (
		<div class={`flex w-full flex-none gap-3 portrait:flex-wrap landscape:flex-col`}>
			{/* 主手 */}
			<section
				role="application"
				onClick={() => {
					if (props.slots.mainHand) {
						props.onItemPreviewRequested("mainHand", props.slots.mainHand);
					}
				}}
				onKeyUp={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				class="MainHand  border-dividing-color flex flex-col gap-1 overflow-hidden backdrop-blur portrait:w-[calc(50%-6px)] portrait:rounded portrait:border landscape:w-full landscape:border-b"
			>
				<div class="Label px-4 py-3">{dictionary().ui.character.tabs.equipment.mainHand}</div>
				<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
					<Show when={props.slots.mainHand} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
						{(mainWeapon) => (
							<>
								<Icons.Spirits iconName={mainWeapon().type ?? ""} size={36} />
								{mainWeapon().name}
							</>
						)}
					</Show>
				</div>
				<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
					<Button
						icon={<Icons.Outline.Category />}
						level="quaternary"
						class="rounded-none"
						onClick={() => {
							// 打开装备选择器
							props.onPickRequested("mainHand");
						}}
					/>
					<Show
						when={props.slots.mainHand?.id}
						fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />}
					>
						<Button
							icon={<Icons.Outline.Trash />}
							level="quaternary"
							class="rounded-none rounded-tr"
							onClick={async () => {
								props.onClearRequested("mainHand");
							}}
						/>
					</Show>
				</button>
			</section>
			{/* 副手 */}
			<section
				role="application"
				onClick={() => {
					if (props.slots.subHand) {
						props.onItemPreviewRequested("subHand", props.slots.subHand);
					}
				}}
				onKeyUp={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				class="SubHand  border-dividing-color flex flex-col gap-1 overflow-hidden backdrop-blur portrait:w-[calc(50%-6px)] portrait:rounded portrait:border landscape:w-full landscape:border-b"
			>
				<div class="Label px-4 py-3">{dictionary().ui.character.tabs.equipment.subHand}</div>
				<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
					<Show when={props.slots.subHand} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
						{(subWeapon) => (
							<>
								<Icons.Spirits iconName={subWeapon().type ?? ""} size={36} />
								{subWeapon().name}
							</>
						)}
					</Show>
				</div>
				<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
					<Button
						icon={<Icons.Outline.Category />}
						level="quaternary"
						class="rounded-none"
						onClick={() => {
							// 打开装备选择器
							props.onPickRequested("subHand");
						}}
					/>
					<Show
						when={props.slots.subHand?.id}
						fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />}
					>
						<Button
							icon={<Icons.Outline.Trash />}
							level="quaternary"
							class="rounded-none rounded-tr"
							onClick={async () => {
								props.onClearRequested("subHand");
							}}
						/>
					</Show>
				</button>
			</section>
			{/* 防具 */}
			<section
				role="application"
				onClick={() => {
					if (props.slots.armor) {
						props.onItemPreviewRequested("armor", props.slots.armor);
					}
				}}
				onKeyUp={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				class="Armor  border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border portrait:py-2 landscape:border-b"
			>
				<div class="Label px-4 py-3 portrait:hidden">{dictionary().ui.character.tabs.equipment.armor}</div>
				<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
					<Show when={props.slots.armor} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
						{(armor) => (
							<>
								<Icons.Spirits iconName={armor().ability ?? ""} size={36} />
								{armor().name}
							</>
						)}
					</Show>
				</div>
				<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
					<Button
						icon={<Icons.Outline.Category />}
						level="quaternary"
						class="rounded-none"
						onClick={() => {
							// 打开装备选择器
							props.onPickRequested("armor");
						}}
					/>
					<Show
						when={props.slots.armor?.id}
						fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />}
					>
						<Button
							icon={<Icons.Outline.Trash />}
							level="quaternary"
							class="rounded-none rounded-tr"
							onClick={async () => {
								props.onClearRequested("armor");
							}}
						/>
					</Show>
				</button>
			</section>
			{/* 追加 */}
			<section
				role="application"
				onClick={() => {
					if (props.slots.additional) {
						props.onItemPreviewRequested("additional", props.slots.additional);	
					}
				}}
				onKeyUp={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				class="OptEquip  border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border portrait:py-2 landscape:border-b"
			>
				<div class="Label px-4 py-3 portrait:hidden">{dictionary().ui.character.tabs.equipment.option}</div>
				<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
					<Show when={props.slots.additional} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
						{(option) => (
							<>
								<Icons.Spirits iconName={"option"} size={36} />
								{option().name}
							</>
						)}
					</Show>
				</div>
				<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
					<Button
						icon={<Icons.Outline.Category />}
						level="quaternary"
						class="rounded-none"
						onClick={() => {
							// 打开装备选择器
							props.onPickRequested("additional");
						}}
					/>
					<Show
						when={props.slots.additional?.id}
						fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />}
					>
						<Button
							icon={<Icons.Outline.Trash />}
							level="quaternary"
							class="rounded-none rounded-tr"
							onClick={async () => {
								props.onClearRequested("additional");
							}}
						/>
					</Show>
				</button>
			</section>
			{/* 特殊 */}
			<section
				role="application"
				onClick={() => {
					if (props.slots.special) {
						props.onItemPreviewRequested("special", props.slots.special);
					}
				}}
				onKeyUp={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				class="SpeEquip  border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border portrait:py-2 landscape:border-b"
			>
				<div class="Label px-4 py-3 portrait:hidden">{dictionary().ui.character.tabs.equipment.special}</div>
				<div class="Selector flex w-full items-center gap-2 overflow-hidden px-4 text-ellipsis whitespace-nowrap">
					<Show when={props.slots.special} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
						{(special) => (
							<>
								<Icons.Spirits iconName={"special"} size={36} />
								{special().name}
							</>
						)}
					</Show>
				</div>
				<button type="button" onClick={(e) => e.stopPropagation()} class="Function flex flex-none">
					<Button
						icon={<Icons.Outline.Category />}
						level="quaternary"
						class="rounded-none"
						onClick={() => {
							// 打开装备选择器
							props.onPickRequested("special");
						}}
					/>
					<Show
						when={props.slots.special?.id}
						fallback={<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />}
					>
						<Button
							icon={<Icons.Outline.Trash />}
							level="quaternary"
							class="rounded-none rounded-tr"
							onClick={async () => {
								props.onClearRequested("special");
							}}
						/>
					</Show>
				</button>
			</section>
			{/* 时装 */}
		</div>
	);
}
