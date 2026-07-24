import { defaultData } from "@db/defaultData";
import { getPrimaryKeys } from "@db/generated/dmmf-utils";
import { type RepositoryWriterContext, repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { PlayerArmorWithRelations } from "@db/generated/repositories/player_armor";
import type { PlayerOptionWithRelations } from "@db/generated/repositories/player_option";
import type { PlayerSpecialWithRelations } from "@db/generated/repositories/player_special";
import type { PlayerWeaponWithRelations } from "@db/generated/repositories/player_weapon";
import { type character, type DB, DBSchema } from "@db/generated/zod";
import type { VisibilityState } from "@tanstack/solid-table";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import type { TableDataConfig, TableDataConfigurator } from "~/components/business/data-config";
import { PLAYER_ARMOR_DATA_CONFIG } from "~/components/business/dataConfig/player_armor";
import { PLAYER_OPTION_DATA_CONFIG } from "~/components/business/dataConfig/player_option";
import { PLAYER_SPECIAL_DATA_CONFIG } from "~/components/business/dataConfig/player_special";
import { PLAYER_WEAPON_DATA_CONFIG } from "~/components/business/dataConfig/player_weapon";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { VirtualTable } from "~/components/dataDisplay/virtualTable";
import { Form } from "~/components/form/Form";
import { Icons } from "~/components/icons";
import { useDictionary } from "~/contexts/Dictionary";
import type { CharacterFieldPatch } from "~/features/character/edit/characterEditProtocol";
import { type OverlayLayerHandle, useOverlay } from "~/lib/overlay/OverlayContext";
import { createLiveKyselyQuery } from "~/lib/pglite/liveQuery";
import type { ZodSchemaFor } from "~/lib/utils/zod";
import type { Dic } from "~/locales/type";
import { useInterfaceActor, useInterfaceSnapshot } from "~/machines/AppActorContext";
import type { CharacterEquipmentSlot } from "~/machines/interface/characterEquipment";
import {
	createEditCharacterEquipmentEvent,
	createInspectCharacterEquipmentEvent,
	selectCharacterEquipmentInteraction,
} from "~/machines/interfaceStateMachine";
import { store } from "~/store";

export type EquipmentSlot = "weaponId" | "subWeaponId" | "armorId" | "optionId" | "specialId";

export type EquipmentPanelProps = {
	character: CharacterWithRelations;
	onPatchRequested: (patch: CharacterFieldPatch) => Promise<void> | void;
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

type EquipmentTableName = (typeof equipmentSlotConfig)[EquipmentSlot];
type EquipmentSlotTable<S extends EquipmentSlot> = (typeof equipmentSlotConfig)[S];
type EquipmentTableRow<T extends EquipmentTableName> = DB[T];
type EquipmentSlotRow<S extends EquipmentSlot> = EquipmentTableRow<EquipmentSlotTable<S>>;

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

/**
 * 装备配置绑定对象：把 schema、dic、defaultData 和 UIConfig 捆绑在同一个泛型 T 下，
 * 保证 Form 的各 prop 类型一致，无需在调用点散落 as never 断言。
 * 同 wiki/[subName].tsx 的 createTableConfig 模式。
 */
type EquipmentConfig<T extends EquipmentTableName> = {
	schema: ZodSchemaFor<DB[T]>;
	dic: Dic<DB[T]>;
	defaultData: DB[T];
	uiConfig: TableDataConfig<T, DB[T]>;
};

const equipmentDataConfigFactories = {
	player_weapon: PLAYER_WEAPON_DATA_CONFIG,
	player_armor: PLAYER_ARMOR_DATA_CONFIG,
	player_option: PLAYER_OPTION_DATA_CONFIG,
	player_special: PLAYER_SPECIAL_DATA_CONFIG,
} as const satisfies { [T in EquipmentTableName]: TableDataConfigurator<T, EquipmentTableRow<T>> };

const getEquipmentConfig = <T extends EquipmentTableName>(
	tableName: T,
	dict: ReturnType<ReturnType<typeof useDictionary>>,
): EquipmentConfig<T> => {
	const configFactory = equipmentDataConfigFactories[tableName] as unknown as TableDataConfigurator<T, DB[T]>;
	return {
		schema: DBSchema[tableName],
		dic: dict.db[tableName],
		defaultData: defaultData[tableName],
		uiConfig: configFactory(dict),
	} as EquipmentConfig<T>; // 单一断言：动态索引无法静态证明键集一致，集中处理
};

const toCharacterPatch = <S extends EquipmentSlot>(slot: S, id: string): Pick<character, S> => {
	return { [slot]: id } as Pick<character, S>;
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
		void props.onPatchRequested({ [slot]: null } as CharacterFieldPatch);
	};

	const openEquipmentCreateForm = <S extends EquipmentSlot>(slot: S) => {
		const tableName = equipmentSlotConfig[slot];
		const config = getEquipmentConfig(tableName, dictionary());
		const initialValue = withBelongToPlayerId(
			config.defaultData as EquipmentTableRow<typeof tableName>,
			props.character.belongToPlayerId,
		);

		overlay.openSheet({
			render: (api) => (
				<Form<DB[typeof tableName]>
					mode="create"
					value={initialValue}
					defaultValue={config.defaultData}
					dataSchema={config.schema}
					dictionary={config.dic}
					hiddenFields={config.uiConfig.form.hiddenFields}
					fieldGroupMap={config.uiConfig.fieldGroupMap}
					renderers={config.uiConfig.form.renderers}
					onSubmit={async (value) => {
						// 装备槽位依赖刚创建记录的真实主键，先插入装备再回写 character FK。
						const context: RepositoryWriterContext = {
							accountId: store.session.account.id,
							accountType: store.session.account.type,
						};
						const writer = repositoryWriters[tableName];
						if (!writer?.create) throw new Error(`${tableName} 不支持创建`);
						const inserted = await writer.create(context, value as never);
						const primaryValue = readInsertedEquipmentId(inserted as { id: unknown }, tableName);
						await props.onPatchRequested(toCharacterPatch(slot, primaryValue));
						api.close();
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

		await props.onPatchRequested({ [slot]: primaryValue } as CharacterFieldPatch);
	};

	const projectEquipmentPickerSheet = (slot: EquipmentSlot) => {
		const tableType = equipmentSlotConfig[slot];
		const dict = dictionary();
		const config = getEquipmentConfig(tableType, dict);
		const primaryKey = getPrimaryKeys(tableType)[0] as keyof EquipmentTableRow<typeof tableType>;

		let layerId: string | undefined;
		const handle = overlay.openSheet({
			render: (api) => {
				const [filterText, setFilterText] = createSignal("");
				const [columnVisibility, setColumnVisibility] = createSignal<VisibilityState>({});

				return (
					<div class="flex portrait:h-[90dvh] w-full h-full flex-col gap-2 p-6">
						<div class="sheetTitle w-full text-xl font-bold flex items-center justify-between">
							{dict.db[tableType].selfName}
							<Button
								icon={<Icons.Outline.Close />}
								level="quaternary"
								class="rounded-none rounded-tr"
								onClick={api.close}
							/>
						</div>
						<div class="TableBox p-3 rounded border-dividing-color border w-full h-full">
							<VirtualTable<EquipmentTableRow<typeof tableType>>
								measure={config.uiConfig.table.measure}
								query={(db) => repositoryReaders[tableType]?.getAll?.(db) ?? null}
								primaryKey={primaryKey}
								columnsDef={config.uiConfig.table.columnsDef}
								hiddenColumnDef={config.uiConfig.table.hiddenColumnDef}
								tdGenerator={config.uiConfig.table.tdGenerator}
								defaultSort={config.uiConfig.table.defaultSort}
								dictionary={config.dic as never}
								globalFilterStr={filterText}
								rowHandleClick={(row) => void pickEquipment(slot, row as Record<string, unknown>)}
								columnVisibility={columnVisibility()}
								onColumnVisibilityChange={(updater) => {
									if (typeof updater === "function") setColumnVisibility(updater(columnVisibility()));
								}}
							/>
						</div>
						<Input type="text" value={filterText()} onInput={(e) => setFilterText(e.currentTarget.value)} />
					</div>
				);
			},
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
