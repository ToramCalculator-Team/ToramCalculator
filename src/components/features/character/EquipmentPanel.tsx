import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { PlayerArmorWithRelations } from "@db/generated/repositories/player_armor";
import type { PlayerOptionWithRelations } from "@db/generated/repositories/player_option";
import type { PlayerSpecialWithRelations } from "@db/generated/repositories/player_special";
import type { PlayerWeaponWithRelations } from "@db/generated/repositories/player_weapon";
import type { character, DB } from "@db/generated/zod";
import { createSignal, Show } from "solid-js";
import { ForeignKeyPickerSheet } from "~/components/business/table/ForeignKeyPickerSheet";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";

export type EquipmentSlot = "weaponId" | "subWeaponId" | "armorId" | "optionId" | "specialId";

export type EquipmentPanelProps = {
	character: CharacterWithRelations;
	onPatchRequested: (patch: Partial<character>) => Promise<void> | void;
	onItemPreviewRequested: (type: keyof DB, data: unknown) => void;
};

const equipmentSlotConfig: Record<EquipmentSlot, keyof DB> = {
	weaponId: "player_weapon",
	subWeaponId: "player_weapon",
	armorId: "player_armor",
	optionId: "player_option",
	specialId: "player_special",
};

export function EquipmentPanel(props: EquipmentPanelProps) {
	const dictionary = useDictionary();
	const [pickerOpen, setPickerOpen] = createSignal(false);
	const [pickerSlot, setPickerSlot] = createSignal<EquipmentSlot>("weaponId");

	// 槽位到数据表的映射留在装备面板内，保证通用选择器无需知道 character 的字段结构。
	const pickerTableType = () => equipmentSlotConfig[pickerSlot()];

	const openEquipmentPicker = (slot: EquipmentSlot) => {
		setPickerSlot(slot);
		setPickerOpen(true);
	};

	const clearEquipmentSlot = (slot: EquipmentSlot) => {
		// data.prisma 将装备外键定义为 String?；清空装备用 NULL 表达无关联。
		void props.onPatchRequested({ [slot]: null } as Partial<character>);
	};

	const previewEquipmentItem = (
		slot: EquipmentSlot,
		item: PlayerWeaponWithRelations | PlayerArmorWithRelations | PlayerOptionWithRelations | PlayerSpecialWithRelations,
	) => {
		props.onItemPreviewRequested(equipmentSlotConfig[slot], item);
	};

	const pickEquipment = async (row: Record<string, unknown>) => {
		const tableType = pickerTableType();
		const primaryKey = getPrimaryKeys(tableType)[0];
		if (!primaryKey) return;

		const primaryValue = row[String(primaryKey)];
		if (typeof primaryValue !== "string") return;

		await props.onPatchRequested({ [pickerSlot()]: primaryValue } as Partial<character>);
	};

	return (
		<>
			<div class="flex w-full flex-none gap-3 portrait:flex-wrap landscape:flex-col">
				{/* 主手 */}
				<section
					role="application"
					onClick={() => {
						if (props.character.weapon) {
							previewEquipmentItem("weaponId", props.character.weapon);
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
						<Show when={props.character.weapon} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
							{(mainWeapon) => (
								<>
									<Icons.Spirits iconName={mainWeapon().type ?? ""} size={36} />
									{mainWeapon().name}
								</>
							)}
						</Show>
					</div>
					<div class="Function flex flex-none">
						<Button
							icon={<Icons.Outline.Category />}
							level="quaternary"
							class="rounded-none"
							onClick={(e) => {
								e.stopPropagation();
								// 打开装备选择器
								openEquipmentPicker("weaponId");
							}}
						/>
						<Show
							when={props.character.weapon?.id}
							fallback={
								<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />
							}
						>
							<Button
								icon={<Icons.Outline.Trash />}
								level="quaternary"
								class="rounded-none rounded-tr"
								onClick={(e) => {
									e.stopPropagation();
									clearEquipmentSlot("weaponId");
								}}
							/>
						</Show>
					</div>
				</section>
				{/* 副手 */}
				<section
					role="application"
					onClick={() => {
						if (props.character.subWeapon) {
							previewEquipmentItem("subWeaponId", props.character.subWeapon);
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
						<Show when={props.character.subWeapon} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
							{(subWeapon) => (
								<>
									<Icons.Spirits iconName={subWeapon().type ?? ""} size={36} />
									{subWeapon().name}
								</>
							)}
						</Show>
					</div>
					<div class="Function flex flex-none">
						<Button
							icon={<Icons.Outline.Category />}
							level="quaternary"
							class="rounded-none"
							onClick={(e) => {
								e.stopPropagation();
								// 打开装备选择器
								openEquipmentPicker("subWeaponId");
							}}
						/>
						<Show
							when={props.character.subWeapon?.id}
							fallback={
								<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />
							}
						>
							<Button
								icon={<Icons.Outline.Trash />}
								level="quaternary"
								class="rounded-none rounded-tr"
								onClick={(e) => {
									e.stopPropagation();
									clearEquipmentSlot("subWeaponId");
								}}
							/>
						</Show>
					</div>
				</section>
				{/* 防具 */}
				<section
					role="application"
					onClick={() => {
						if (props.character.armor) {
							previewEquipmentItem("armorId", props.character.armor);
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
						<Show when={props.character.armor} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
							{(armor) => (
								<>
									<Icons.Spirits iconName={armor().ability ?? ""} size={36} />
									{armor().name}
								</>
							)}
						</Show>
					</div>
					<div class="Function flex flex-none">
						<Button
							icon={<Icons.Outline.Category />}
							level="quaternary"
							class="rounded-none"
							onClick={(e) => {
								e.stopPropagation();
								// 打开装备选择器
								openEquipmentPicker("armorId");
							}}
						/>
						<Show
							when={props.character.armor?.id}
							fallback={
								<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />
							}
						>
							<Button
								icon={<Icons.Outline.Trash />}
								level="quaternary"
								class="rounded-none rounded-tr"
								onClick={(e) => {
									e.stopPropagation();
									clearEquipmentSlot("armorId");
								}}
							/>
						</Show>
					</div>
				</section>
				{/* 追加 */}
				<section
					role="application"
					onClick={() => {
						if (props.character.option) {
							previewEquipmentItem("optionId", props.character.option);
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
						<Show when={props.character.option} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
							{(option) => (
								<>
									<Icons.Spirits iconName={"option"} size={36} />
									{option().name}
								</>
							)}
						</Show>
					</div>
					<div class="Function flex flex-none">
						<Button
							icon={<Icons.Outline.Category />}
							level="quaternary"
							class="rounded-none"
							onClick={(e) => {
								e.stopPropagation();
								// 打开装备选择器
								openEquipmentPicker("optionId");
							}}
						/>
						<Show
							when={props.character.option?.id}
							fallback={
								<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />
							}
						>
							<Button
								icon={<Icons.Outline.Trash />}
								level="quaternary"
								class="rounded-none rounded-tr"
								onClick={(e) => {
									e.stopPropagation();
									clearEquipmentSlot("optionId");
								}}
							/>
						</Show>
					</div>
				</section>
				{/* 特殊 */}
				<section
					role="application"
					onClick={() => {
						if (props.character.special) {
							previewEquipmentItem("specialId", props.character.special);
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
						<Show when={props.character.special} fallback={<Icons.Spirits iconName="unknown" size={36} />}>
							{(special) => (
								<>
									<Icons.Spirits iconName={"special"} size={36} />
									{special().name}
								</>
							)}
						</Show>
					</div>
					<div class="Function flex flex-none">
						<Button
							icon={<Icons.Outline.Category />}
							level="quaternary"
							class="rounded-none"
							onClick={(e) => {
								e.stopPropagation();
								// 打开装备选择器
								openEquipmentPicker("specialId");
							}}
						/>
						<Show
							when={props.character.special?.id}
							fallback={
								<Button icon={<Icons.Outline.DocmentAdd />} level="quaternary" class="rounded-none rounded-tr" />
							}
						>
							<Button
								icon={<Icons.Outline.Trash />}
								level="quaternary"
								class="rounded-none rounded-tr"
								onClick={(e) => {
									e.stopPropagation();
									clearEquipmentSlot("specialId");
								}}
							/>
						</Show>
					</div>
				</section>
				{/* 时装 */}
			</div>
			<ForeignKeyPickerSheet<Record<string, unknown>>
				open={pickerOpen()}
				title={dictionary().db[pickerTableType()].selfName}
				tableType={pickerTableType()}
				onOpenChange={(open) => setPickerOpen(open)}
				onPick={pickEquipment}
			/>
		</>
	);
}
