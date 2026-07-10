import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { PlayerArmorWithRelations } from "@db/generated/repositories/player_armor";
import { selectPlayerArmorByIdWithRelations } from "@db/generated/repositories/player_armor";
import type { PlayerOptionWithRelations } from "@db/generated/repositories/player_option";
import { selectPlayerOptionByIdWithRelations } from "@db/generated/repositories/player_option";
import type { PlayerSpecialWithRelations } from "@db/generated/repositories/player_special";
import { selectPlayerSpecialByIdWithRelations } from "@db/generated/repositories/player_special";
import type { PlayerWeaponWithRelations } from "@db/generated/repositories/player_weapon";
import { selectPlayerWeaponByIdWithRelations } from "@db/generated/repositories/player_weapon";
import type { character, DB } from "@db/generated/zod";
import { createEffect, createMemo, onCleanup, Show } from "solid-js";
import type { TableDataConfig } from "~/components/business/data-config";
import { PLAYER_ARMOR_DATA_CONFIG } from "~/components/business/dataConfig/player_armor";
import { PLAYER_OPTION_DATA_CONFIG } from "~/components/business/dataConfig/player_option";
import { PLAYER_SPECIAL_DATA_CONFIG } from "~/components/business/dataConfig/player_special";
import { PLAYER_WEAPON_DATA_CONFIG } from "~/components/business/dataConfig/player_weapon";
import { DataForm } from "~/components/business/form/DataForm";
import { ForeignKeyPickerSheetContent } from "~/components/business/table/ForeignKeyPickerSheet";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import { type OverlayLayerHandle, useOverlay } from "~/lib/overlay/OverlayContext";
import { useInterfaceActor, useInterfaceSnapshot } from "~/machines/AppActorContext";
import {
	createEditCharacterEquipmentEvent,
	createInspectCharacterEquipmentEvent,
	selectCharacterEquipmentInteraction,
} from "~/machines/interfaceStateMachine";
import type { CharacterEquipmentSlot } from "~/shared/interaction/characterEquipment";

export type EquipmentSlot = "weaponId" | "subWeaponId" | "armorId" | "optionId" | "specialId";

export type EquipmentPanelProps = {
	character: CharacterWithRelations;
	onPatchRequested: (patch: Partial<character>, relations?: Partial<CharacterWithRelations>) => Promise<void> | void;
	onItemPreviewRequested: (type: keyof DB, data: unknown) => void;
};

const equipmentSlotConfig = {
	weaponId: "player_weapon",
	subWeaponId: "player_weapon",
	armorId: "player_armor",
	optionId: "player_option",
	specialId: "player_special",
} as const satisfies Record<EquipmentSlot, keyof DB>;

// AUI 语义槽名 ↔ DB 外键列名的映射只留在消费侧；状态机不感知 character 表结构。
const slotToSemantic = {
	weaponId: "weapon",
	subWeaponId: "subWeapon",
	armorId: "armor",
	optionId: "option",
	specialId: "special",
} as const satisfies Record<EquipmentSlot, CharacterEquipmentSlot>;

const semanticToSlot = {
	weapon: "weaponId",
	subWeapon: "subWeaponId",
	armor: "armorId",
	option: "optionId",
	special: "specialId",
} as const satisfies Record<CharacterEquipmentSlot, EquipmentSlot>;

const equipmentRelationKeyConfig = {
	weaponId: "weapon",
	subWeaponId: "subWeapon",
	armorId: "armor",
	optionId: "option",
	specialId: "special",
} as const satisfies Record<EquipmentSlot, keyof CharacterWithRelations>;

type EquipmentTableName = (typeof equipmentSlotConfig)[EquipmentSlot];
type EquipmentSlotTable<S extends EquipmentSlot> = (typeof equipmentSlotConfig)[S];
type EquipmentTableRow<T extends EquipmentTableName> = DB[T];
type EquipmentSlotRow<S extends EquipmentSlot> = EquipmentTableRow<EquipmentSlotTable<S>>;

type EquipmentRelationByTable = {
	player_weapon: PlayerWeaponWithRelations;
	player_armor: PlayerArmorWithRelations;
	player_option: PlayerOptionWithRelations;
	player_special: PlayerSpecialWithRelations;
};

type EquipmentRelation<T extends EquipmentTableName> = EquipmentRelationByTable[T];

const withBelongToPlayerId = <T extends EquipmentTableName>(
	value: EquipmentTableRow<T>,
	belongToPlayerId: string,
): EquipmentTableRow<T> => ({
	...value,
	belongToPlayerId,
});

const readInsertedEquipmentId = (row: { id: unknown }, tableName: string): string => {
	// 设计说明：当前装备槽位只接入玩家装备表，这些表都以 id 作为主键；这里把表单配置主键推断从槽位联合类型中移出。
	const primaryValue = row.id;
	if (typeof primaryValue !== "string") {
		throw new Error(`${tableName} 新增结果缺少字符串主键`);
	}
	return primaryValue;
};

const equipmentDataConfigFactories = {
	player_weapon: PLAYER_WEAPON_DATA_CONFIG,
	player_armor: PLAYER_ARMOR_DATA_CONFIG,
	player_option: PLAYER_OPTION_DATA_CONFIG,
	player_special: PLAYER_SPECIAL_DATA_CONFIG,
} as const satisfies { [T in EquipmentTableName]: TableDataConfig<EquipmentTableRow<T>> };

const equipmentRelationLoaders = {
	player_weapon: selectPlayerWeaponByIdWithRelations,
	player_armor: selectPlayerArmorByIdWithRelations,
	player_option: selectPlayerOptionByIdWithRelations,
	player_special: selectPlayerSpecialByIdWithRelations,
} as const satisfies { [T in EquipmentTableName]: (id: string) => Promise<EquipmentRelation<T> | undefined> };

const equipmentRelationFallbacks = {
	player_weapon: (inserted) => ({ ...inserted, template: null, crystals: [] }),
	player_armor: (inserted) => ({ ...inserted, template: null, crystals: [] }),
	player_option: (inserted) => ({ ...inserted, template: null, crystals: [] }),
	player_special: (inserted) => ({ ...inserted, template: null, crystals: [] }),
} satisfies { [T in EquipmentTableName]: (inserted: EquipmentTableRow<T>) => EquipmentRelation<T> };

const getEquipmentDataConfig = <T extends EquipmentTableName>(
	tableName: T,
	dictionary: Parameters<TableDataConfig<EquipmentTableRow<T>>>[0],
): ReturnType<TableDataConfig<EquipmentTableRow<T>>> => {
	// 设计说明：配置表已用 satisfies 校验 tableName 与 row 类型对应关系；这里保留泛型索引后的字面量关联。
	const configFactory = equipmentDataConfigFactories[tableName] as unknown as TableDataConfig<EquipmentTableRow<T>>;
	return configFactory(dictionary);
};

const loadEquipmentWithRelations = async <T extends EquipmentTableName>(
	tableName: T,
	id: string,
	inserted: EquipmentTableRow<T>,
): Promise<EquipmentRelation<T>> => {
	const selectWithRelations = equipmentRelationLoaders[tableName] as (
		id: string,
	) => Promise<EquipmentRelation<T> | undefined>;
	const fallbackWithRelations = equipmentRelationFallbacks[tableName] as unknown as (
		inserted: EquipmentTableRow<T>,
	) => EquipmentRelation<T>;
	return (await selectWithRelations(id)) ?? fallbackWithRelations(inserted);
};

const toCharacterPatch = <S extends EquipmentSlot>(slot: S, id: string): Pick<character, S> => {
	return { [slot]: id } as Pick<character, S>;
};

const toRelationPatch = <S extends EquipmentSlot>(
	slot: S,
	relation: EquipmentRelation<EquipmentSlotTable<S>>,
): Partial<CharacterWithRelations> => {
	return { [equipmentRelationKeyConfig[slot]]: relation } as Partial<CharacterWithRelations>;
};

export function EquipmentPanel(props: EquipmentPanelProps) {
	const dictionary = useDictionary();
	// EquipmentPanel 渲染于角色页根作用域(非浮层内),openSheet 新建根级 sheet layer。
	const overlay = useOverlay();
	const interfaceActor = useInterfaceActor();
	const interfaceState = useInterfaceSnapshot();
	let equipmentPickerSheetHandle: OverlayLayerHandle | undefined;
	let equipmentPickerSheetSlot: EquipmentSlot | undefined;

	const equipmentInteraction = createMemo(() => {
		const interaction = selectCharacterEquipmentInteraction(interfaceState());
		return interaction?.characterId === props.character.id ? interaction : null;
	});

	const focusedSlot = createMemo<CharacterEquipmentSlot | null>(() => equipmentInteraction()?.equipmentSlot ?? null);

	const inspectSlot = (slot: EquipmentSlot) => {
		interfaceActor.send(createInspectCharacterEquipmentEvent(props.character.id, slotToSemantic[slot]));
	};

	const editSlot = (slot: EquipmentSlot) => {
		interfaceActor.send(createEditCharacterEquipmentEvent(props.character.id, slotToSemantic[slot]));
	};

	const returnToCharacterOverview = () => {
		interfaceActor.send({ type: "character.overview", characterId: props.character.id });
	};

	const closeEquipmentPickerSheet = () => {
		const handle = equipmentPickerSheetHandle;
		equipmentPickerSheetHandle = undefined;
		equipmentPickerSheetSlot = undefined;
		handle?.close();
	};

	// 聚焦高亮：本槽处于 focused 态时加 ring。
	const focusRing = (slot: EquipmentSlot) =>
		focusedSlot() === slotToSemantic[slot] ? "ring-2 ring-primary-color ring-inset" : "";

	const clearEquipmentSlot = (slot: EquipmentSlot) => {
		// data.prisma 将装备外键定义为 String?；清空装备用 NULL 表达无关联。
		void props.onPatchRequested({ [slot]: null } as Partial<character>);
	};

	const openEquipmentCreateForm = <S extends EquipmentSlot>(slot: S) => {
		const tableName = equipmentSlotConfig[slot];
		const config = getEquipmentDataConfig(tableName, dictionary);

		const initialValue = withBelongToPlayerId(config.defaultData, props.character.belongToPlayerId);

		overlay.openSheet({
			render: (api) => (
				<DataForm<EquipmentSlotRow<S>, typeof config.dataSchema>
					tableName={tableName}
					value={initialValue as EquipmentSlotRow<S>}
					primaryKey={config.primaryKey}
					defaultValue={config.defaultData as EquipmentSlotRow<S>}
					dataSchema={config.dataSchema}
					dictionary={config.dictionary}
					hiddenFields={config.form.hiddenFields}
					fieldGroupMap={config.fieldGroupMap}
					renderers={config.form.renderers}
					inheritsFrom={config.inheritsFrom}
					embeds={config.embeds}
					onInsert={async (value) => {
						// 设计说明：装备槽位依赖刚创建记录的真实主键，因此先插入装备，再回写 character FK。
						const inserted = await config.form.onInsert(value);
						const primaryValue = readInsertedEquipmentId(inserted, tableName);
						const insertedEquipment = await loadEquipmentWithRelations(tableName, primaryValue, inserted);
						// 设计说明：新增装备写库后立即把 relation 回填到角色页工作副本，避免 FK 已变更但槽位 UI 等待整页重载。
						await props.onPatchRequested(
							toCharacterPatch(slot, primaryValue),
							toRelationPatch(slot, insertedEquipment),
						);
						api.close();
						return inserted;
					}}
					onUpdate={async (primaryKeyValue, value) => {
						const result = await config.form.onUpdate(primaryKeyValue, value);
						api.close();
						return result;
					}}
				/>
			),
		});
	};

	const previewEquipmentItem = (
		slot: EquipmentSlot,
		item: PlayerWeaponWithRelations | PlayerArmorWithRelations | PlayerOptionWithRelations | PlayerSpecialWithRelations,
	) => {
		props.onItemPreviewRequested(equipmentSlotConfig[slot], item);
	};

	const pickEquipment = async (slot: EquipmentSlot, row: Record<string, unknown>) => {
		const tableType = equipmentSlotConfig[slot];
		const primaryKey = getPrimaryKeys(tableType)[0];
		if (!primaryKey) return;

		const primaryValue = row[String(primaryKey)];
		if (typeof primaryValue !== "string") return;

		await props.onPatchRequested({ [slot]: primaryValue } as Partial<character>);
	};

	const projectEquipmentPickerSheet = (slot: EquipmentSlot) => {
		const tableType = equipmentSlotConfig[slot];
		let layerId: string | undefined;
		const handle = overlay.openSheet({
			render: (api) => (
				<ForeignKeyPickerSheetContent<Record<string, unknown>>
					title={dictionary().db[tableType].selfName}
					tableType={tableType}
					onClose={api.close}
					onPick={(row) => pickEquipment(slot, row)}
				/>
			),
			onCloseRequest: () => {
				if (equipmentPickerSheetHandle?.layerId === layerId) {
					equipmentPickerSheetHandle = undefined;
					equipmentPickerSheetSlot = undefined;
				}
				const interaction = equipmentInteraction();
				if (interaction?.mode === "editing" && interaction.equipmentSlot === slotToSemantic[slot]) {
					returnToCharacterOverview();
				}
			},
		});
		layerId = handle.layerId;
		equipmentPickerSheetHandle = handle;
		equipmentPickerSheetSlot = slot;
	};

	// sheet 是 editing 状态的 UI 投影；点击处理器不直接操作 overlay。
	createEffect(() => {
		const interaction = equipmentInteraction();
		const editingSlot = interaction?.mode === "editing" ? semanticToSlot[interaction.equipmentSlot] : undefined;
		if (!editingSlot) {
			closeEquipmentPickerSheet();
			return;
		}
		if (equipmentPickerSheetHandle && equipmentPickerSheetSlot === editingSlot) return;
		closeEquipmentPickerSheet();
		projectEquipmentPickerSheet(editingSlot);
	});

	onCleanup(() => {
		returnToCharacterOverview();
		closeEquipmentPickerSheet();
	});

	return (
		<div class="flex w-full flex-none gap-3 portrait:flex-wrap landscape:flex-col">
			{/* 主手 */}
			<section
				role="application"
				onClick={() => {
					inspectSlot("weaponId");
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
				class={`MainHand  border-dividing-color flex flex-col gap-1 overflow-hidden backdrop-blur portrait:w-[calc(50%-6px)] portrait:rounded portrait:border landscape:w-full landscape:border-b ${focusRing("weaponId")}`}
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
							editSlot("weaponId");
						}}
					/>
					<Button
						icon={<Icons.Outline.DocmentAdd />}
						level="quaternary"
						class="rounded-none rounded-tr"
						onClick={(e) => {
							e.stopPropagation();
							openEquipmentCreateForm("weaponId");
						}}
					/>
					<Show when={props.character.weapon?.id}>
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
					inspectSlot("subWeaponId");
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
				class={`SubHand  border-dividing-color flex flex-col gap-1 overflow-hidden backdrop-blur portrait:w-[calc(50%-6px)] portrait:rounded portrait:border landscape:w-full landscape:border-b ${focusRing("subWeaponId")}`}
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
							editSlot("subWeaponId");
						}}
					/>
					<Button
						icon={<Icons.Outline.DocmentAdd />}
						level="quaternary"
						class="rounded-none rounded-tr"
						onClick={(e) => {
							e.stopPropagation();
							openEquipmentCreateForm("subWeaponId");
						}}
					/>
					<Show when={props.character.subWeapon?.id}>
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
					inspectSlot("armorId");
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
				class={`Armor  border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border portrait:py-2 landscape:border-b ${focusRing("armorId")}`}
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
							editSlot("armorId");
						}}
					/>
					<Button
						icon={<Icons.Outline.DocmentAdd />}
						level="quaternary"
						class="rounded-none rounded-tr"
						onClick={(e) => {
							e.stopPropagation();
							openEquipmentCreateForm("armorId");
						}}
					/>
					<Show when={props.character.armor?.id}>
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
					inspectSlot("optionId");
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
				class={`OptEquip  border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border portrait:py-2 landscape:border-b ${focusRing("optionId")}`}
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
							editSlot("optionId");
						}}
					/>
					<Button
						icon={<Icons.Outline.DocmentAdd />}
						level="quaternary"
						class="rounded-none rounded-tr"
						onClick={(e) => {
							e.stopPropagation();
							openEquipmentCreateForm("optionId");
						}}
					/>
					<Show when={props.character.option?.id}>
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
					inspectSlot("specialId");
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
				class={`SpeEquip  border-dividing-color flex w-full flex-col overflow-hidden backdrop-blur portrait:flex-row portrait:rounded portrait:border portrait:py-2 landscape:border-b ${focusRing("specialId")}`}
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
							editSlot("specialId");
						}}
					/>
					<Button
						icon={<Icons.Outline.DocmentAdd />}
						level="quaternary"
						class="rounded-none rounded-tr"
						onClick={(e) => {
							e.stopPropagation();
							openEquipmentCreateForm("specialId");
						}}
					/>
					<Show when={props.character.special?.id}>
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
	);
}
