import type { DB } from "@db/generated/zod";
import {
	type ElementType,
	type MemberType,
	MOB_DIFFICULTY_FLAG,
	type MobDifficultyFlag,
	type MobType,
	SKILL_TREE_TYPE,
	type SkillTreeType,
} from "@db/schema/enums";
import type { AnyFieldApi } from "@tanstack/solid-form";
import type { Cell, ColumnDef } from "@tanstack/solid-table";
import { type Accessor, createEffect, createSignal, type JSX, Show } from "solid-js";
import type { ZodObject, ZodType } from "zod/v4";
import type { FieldGenMap } from "~/components/dataDisplay/objRender";
import { fieldInfo } from "~/components/dataDisplay/utils";
import { Icons } from "~/components/icons";
import { generateBossDataByFlag } from "~/lib/utils/mob";
import type { Dic } from "~/locales/type";
import { store } from "~/store";
import { Input } from "../controls/input";
import { Select } from "../controls/select";
import { BtEditor } from "../features/BtEditor/BtEditor";

export type DataConfig = Partial<{
	[T in keyof DB]: {
		fieldGroupMap: Record<string, Array<keyof DB[T]>>;
		table: {
			measure?: {
				estimateSize: number;
			};
			columnsDef: ColumnDef<DB[T]>[];
			hiddenColumnDef: Array<keyof DB[T]>;
			defaultSort: { id: keyof DB[T]; desc: boolean };
			tdGenerator: Partial<{
				[K in keyof DB[T]]: (props: { cell: Cell<DB[T], unknown>; dic: Dic<DB[T]> }) => JSX.Element;
			}>;
		};
		form: {
			hiddenFields: Array<keyof DB[T]>;
			fieldGenerator?: Partial<{
				[K in keyof DB[T]]: (
					field: Accessor<AnyFieldApi>,
					dictionary: Dic<DB[T]>,
					dataSchema: ZodObject<Record<keyof DB[T], ZodType>>,
				) => JSX.Element;
			}>;
		};
		card: {
			hiddenFields: Array<keyof DB[T]>;
			fieldGenerator?: FieldGenMap<DB[T]>;
			before?: (
				data: DB[T],
				setData: (data: DB[T]) => void,
				dataSchema: ZodObject<Record<keyof DB[T], ZodType>>,
				dictionary: Dic<DB[T]>,
			) => JSX.Element;
			after?: (
				data: DB[T],
				setData: (data: DB[T]) => void,
				dataSchema: ZodObject<Record<keyof DB[T], ZodType>>,
				dictionary: Dic<DB[T]>,
			) => JSX.Element;
		};
	};
}>;

export const DATA_CONFIG: DataConfig = {
	activity: {
		fieldGroupMap: {},
		table: {
			columnsDef: [
				{
					accessorKey: "id",
					cell: (info) => info.getValue(),
					size: 200,
				},
				{
					accessorKey: "name",
					cell: (info) => info.getValue(),
					size: 220,
				},
			],
			hiddenColumnDef: ["id"],
			defaultSort: { id: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			fieldGenerator: {},
		},
	},
	address: {
		fieldGroupMap: {
			基本信息: ["name", "type"],
			坐标信息: ["posX", "posY"],
		},
		table: {
			columnsDef: [
				{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "type", cell: (info) => info.getValue(), size: 160 },
				{ accessorKey: "posX", cell: (info) => info.getValue(), size: 160 },
				{ accessorKey: "posY", cell: (info) => info.getValue(), size: 160 },
			],
			hiddenColumnDef: ["id"],
			defaultSort: { id: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			fieldGenerator: {},
		},
	},
	armor: {
		fieldGroupMap: {
			基本信息: ["name", "baseAbi"],
			其他属性: ["modifiers"],
			颜色信息: ["colorA", "colorB", "colorC"],
		},
		table: {
			columnsDef: [
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			],
			hiddenColumnDef: [],
			defaultSort: { id: "itemId", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {},
		},
	},
	consumable: {
		fieldGroupMap: {},
		table: {
			columnsDef: [
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
				{
					accessorKey: "effectDuration",
					cell: (info) => info.getValue(),
					size: 100,
				},
				{ accessorKey: "effects", cell: (info) => info.getValue(), size: 150 },
			],
			hiddenColumnDef: [],
			defaultSort: { id: "itemId", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {},
		},
	},
	crystal: {
		fieldGroupMap: {
			基本信息: ["name", "type", "modifiers"],
		},
		table: {
			measure: {
				estimateSize: 160,
			},
			columnsDef: [
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 150 },
				{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
				{
					accessorKey: "modifiers",
					cell: (info) => info.getValue(),
					size: 480,
				},
				{ accessorKey: "type", cell: (info) => info.getValue(), size: 100 },
			],
			hiddenColumnDef: [],
			defaultSort: { id: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {
				name: (data, key, dictionary) => {
					return (
						<div class="Field flex gap-2">
							<span class="text-main-text-color text-nowrap">{dictionary.fields[key].key}</span>:
							<span class="flex items-center gap-2 font-bold">
								<Icons.Spirits iconName={data.type} size={24} /> {String(data[key])}
							</span>
						</div>
					);
				},
			},
		},
	},
	drop_item: {
		fieldGroupMap: {},
		table: {
			columnsDef: [],
			hiddenColumnDef: [],
			defaultSort: { id: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: ["id"],
			fieldGenerator: {},
		},
	},
	item: {
		fieldGroupMap: {
			基本信息: ["name", "itemType", "itemSourceType"],
			其他属性: ["dataSources", "details"],
		},
		table: {
			columnsDef: [
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "itemType", cell: (info) => info.getValue(), size: 150 },
				{
					accessorKey: "itemSourceType",
					cell: (info) => info.getValue(),
					size: 150,
				},
				{
					accessorKey: "dataSources",
					cell: (info) => info.getValue(),
					size: 150,
				},
				{ accessorKey: "details", cell: (info) => info.getValue(), size: 150 },
			],
			hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			defaultSort: { id: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			fieldGenerator: {},
		},
	},
	material: {
		fieldGroupMap: {
			基本信息: ["name", "type", "price", "ptValue"],
		},
		table: {
			columnsDef: [
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
				{ accessorKey: "price", cell: (info) => info.getValue(), size: 100 },
				{ accessorKey: "ptValue", cell: (info) => info.getValue(), size: 100 },
			],
			hiddenColumnDef: ["itemId"],
			defaultSort: { id: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {},
		},
	},
	mob: {
		fieldGroupMap: {
			常规属性: ["name", "baseLv", "experience", "partsExperience", "maxhp"],
			战斗属性: [
				"initialElement",
				"physicalDefense",
				"physicalResistance",
				"magicalDefense",
				"magicalResistance",
				"criticalResistance",
				"avoidance",
				"block",
				"dodge",
				"normalDefExp",
				"physicDefExp",
				"magicDefExp",
			],
			额外说明: ["details"],
			怪物行为: ["actions"],
			词条信息: ["dataSources"],
		},
		table: {
			columnsDef: [
				{
					id: "id",
					accessorFn: (row) => row.id,
					cell: (info) => info.getValue(),
					size: {
						"zh-CN": 160,
						"zh-TW": 160,
						ja: 160,
						en: 160,
					}[store.settings.userInterface.language],
				},
				{
					id: "name",
					accessorFn: (row) => row.name,
					cell: (info) => info.getValue(),
					size: {
						"zh-CN": 180,
						"zh-TW": 180,
						ja: 260,
						en: 260,
					}[store.settings.userInterface.language],
				},
				{
					id: "initialElement",
					accessorFn: (row) => row.initialElement,
					cell: (info) => info.getValue<ElementType>(),
					size: {
						"zh-CN": 115,
						"zh-TW": 115,
						ja: 115,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "type",
					accessorFn: (row) => row.type,
					cell: (info) => info.getValue<MobType>(),
					size: {
						"zh-CN": 80,
						"zh-TW": 80,
						ja: 120,
						en: 120,
					}[store.settings.userInterface.language],
				},
				{
					id: "captureable",
					accessorFn: (row) => row.captureable,
					cell: (info) => info.getValue<boolean>().toString(),
					size: {
						"zh-CN": 100,
						"zh-TW": 100,
						ja: 100,
						en: 100,
					}[store.settings.userInterface.language],
				},
				{
					id: "baseLv",
					accessorFn: (row) => row.baseLv,
					cell: (info) => info.getValue(),
					size: {
						"zh-CN": 115,
						"zh-TW": 115,
						ja: 180,
						en: 140,
					}[store.settings.userInterface.language],
				},
				{
					id: "experience",
					accessorFn: (row) => row.experience,
					size: {
						"zh-CN": 115,
						"zh-TW": 115,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "physicalDefense",
					accessorFn: (row) => row.physicalDefense,
					size: {
						"zh-CN": 115,
						"zh-TW": 115,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "physicalResistance",
					accessorFn: (row) => row.physicalResistance,
					size: {
						"zh-CN": 115,
						"zh-TW": 115,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "magicalDefense",
					accessorFn: (row) => row.magicalDefense,
					size: {
						"zh-CN": 115,
						"zh-TW": 115,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "magicalResistance",
					accessorFn: (row) => row.magicalResistance,
					size: {
						"zh-CN": 115,
						"zh-TW": 115,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "criticalResistance",
					accessorFn: (row) => row.criticalResistance,
					size: {
						"zh-CN": 115,
						"zh-TW": 115,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "avoidance",
					accessorFn: (row) => row.avoidance,
					size: {
						"zh-CN": 100,
						"zh-TW": 100,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "dodge",
					accessorFn: (row) => row.dodge,
					size: {
						"zh-CN": 100,
						"zh-TW": 100,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "block",
					accessorFn: (row) => row.block,
					size: {
						"zh-CN": 100,
						"zh-TW": 100,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
				{
					id: "actions",
					accessorFn: (row) => row.actions,
					size: {
						"zh-CN": 120,
						"zh-TW": 120,
						ja: 180,
						en: 180,
					}[store.settings.userInterface.language],
				},
			],
			hiddenColumnDef: ["id", "captureable", "actions", "createdByAccountId", "updatedByAccountId"],
			defaultSort: { id: "experience", desc: true },
			tdGenerator: {
				initialElement: (props) =>
					({
						Water: <Icons.Game.ElementWater class="h-12 w-12" />,
						Fire: <Icons.Game.ElementFire class="h-12 w-12" />,
						Earth: <Icons.Game.ElementEarth class="h-12 w-12" />,
						Wind: <Icons.Game.ElementWind class="h-12 w-12" />,
						Light: <Icons.Game.ElementLight class="h-12 w-12" />,
						Dark: <Icons.Game.ElementDark class="h-12 w-12" />,
						Normal: <Icons.Game.ElementNoElement class="h-12 w-12" />,
					})[props.cell.getValue<ElementType>()],
				name: (props) => (
					<div class="text-accent-color flex flex-col gap-1">
						<span>{props.cell.getValue<string>()}</span>
						<Show when={props.cell.row.original.type === "Mob"}>
							<span class="text-main-text-color text-xs">{props.cell.row.original.captureable ? "√" : "×"}</span>
						</Show>
					</div>
				),
			},
		},
		form: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			fieldGenerator: {
				actions: (field) => {
					const value = field().state.value;
					return (
						<BtEditor
							initValues={{
								definition: value.definition ?? "",
								agent: value.agent ?? "",
								memberType: (value.memberType as MemberType) ?? "Mob",
							}}
							onSave={(mdsl, agent, memberType) => {
								field().setValue({
									...value,
									definition: mdsl,
									agent: agent,
									memberType: memberType,
								});
							}}
						/>
					);
				},
			},
		},
		card: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			before: (data, setData) => {
				const [difficulty, setDifficulty] = createSignal<MobDifficultyFlag>(MOB_DIFFICULTY_FLAG[1]);

				createEffect(() => {
					setData(generateBossDataByFlag(data, difficulty()));
				});

				return (
					<Show when={data.type === "Boss"}>
						<Select
							value={difficulty()}
							setValue={(value) => {
								setDifficulty(value as MobDifficultyFlag);
							}}
							options={MOB_DIFFICULTY_FLAG.map((flag) => ({
								label: flag,
								value: flag,
							}))}
							optionGenerator={(option, selected, handleSelect) => {
								return (
									<button
										type="button"
										class={`hover:bg-area-color flex cursor-pointer gap-3 px-3 py-2 ${selected ? "bg-area-color" : ""}`}
										onClick={handleSelect}
									>
										<div class="text-accent-color flex gap-1">
											<Icons.Filled.Star
												class={
													["Normal", "Hard", "Lunatic", "Ultimate"].includes(option.value)
														? "fill-brand-color-1st!"
														: "fill-none!"
												}
											/>
											<Icons.Filled.Star
												class={
													["Hard", "Lunatic", "Ultimate"].includes(option.value)
														? "fill-brand-color-2nd!"
														: "fill-none!"
												}
											/>
											<Icons.Filled.Star
												class={["Lunatic", "Ultimate"].includes(option.value) ? "fill-brand-color-3rd!" : "fill-none!"}
											/>
											<Icons.Filled.Star
												class={["Ultimate"].includes(option.value) ? "fill-brand-color-4th!" : "fill-none!"}
											/>
										</div>
										<span class="text-accent-color">
											Lv:
											{data.baseLv +
												({
													Easy: -1,
													Normal: 0,
													Hard: 1,
													Lunatic: 2,
													Ultimate: 4,
												}[option.value] ?? 0) *
													10}
										</span>
									</button>
								);
							}}
						/>
					</Show>
				);
			},
			fieldGenerator: {},
		},
	},
	npc: {
		fieldGroupMap: {
			基本信息: ["name"],
		},
		table: {
			columnsDef: [
				{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			],
			hiddenColumnDef: [],
			defaultSort: { id: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {},
		},
	},
	option: {
		fieldGroupMap: {
			基本信息: ["name", "baseAbi"],
			其他属性: ["modifiers"],
			颜色信息: ["colorA", "colorB", "colorC"],
		},
		table: {
			columnsDef: [
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
				{
					accessorKey: "modifiers",
					cell: (info) => info.getValue(),
					size: 150,
				},
				{ accessorKey: "colorA", cell: (info) => info.getValue(), size: 150 },
				{ accessorKey: "colorB", cell: (info) => info.getValue(), size: 150 },
				{ accessorKey: "colorC", cell: (info) => info.getValue(), size: 150 },
			],
			hiddenColumnDef: ["itemId"],
			defaultSort: {
				id: "name",
				desc: false,
			},
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {},
		},
	},
	player_weapon: {
		fieldGroupMap: {
			基础属性: ["type", "name", "baseAbi", "stability", "elementType"],
			附加属性: ["extraAbi", "refinement", "modifiers"],
		},
		table: {
			columnsDef: [],
			hiddenColumnDef: [],
			defaultSort: {
				id: "type",
				desc: false,
			},
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {},
		},
	},
	recipe: {
		fieldGroupMap: {
			基本信息: ["id"],
		},
		table: {
			columnsDef: [],
			hiddenColumnDef: [],
			defaultSort: { id: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			fieldGenerator: {},
		},
	},
	recipe_ingredient: {
		fieldGroupMap: {
			基本信息: ["count", "type", "itemId"],
		},
		table: {
			columnsDef: [
				{ accessorKey: "count", cell: (info) => info.getValue(), size: 100 },
				{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
				{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			],
			hiddenColumnDef: [],
			defaultSort: { id: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: ["id"],
			fieldGenerator: {},
		},
	},
	skill: {
		fieldGroupMap: {
			基本信息: ["name", "treeType", "tier", "posX", "posY"],
			技能属性: ["chargingType", "distanceType", "targetType", "isPassive"],
			其他信息: ["dataSources", "details"],
		},
		table: {
			columnsDef: [
				{
					id: "id",
					accessorFn: (row) => row.id,
					cell: (info) => info.getValue(),
					size: 200,
				},
				{
					id: "name",
					accessorFn: (row) => row.name,
					cell: (info) => info.getValue(),
					size: 220,
				},
				{
					id: "treeType",
					accessorFn: (row) => row.treeType,
					cell: (info) => info.getValue<SkillTreeType>(),
					size: 120,
				},
				{
					id: "tier",
					accessorFn: (row) => row.tier,
					cell: (info) => info.getValue<boolean>().toString(),
					size: 160,
				},
				{
					id: "posX",
					accessorFn: (row) => row.posX,
					cell: (info) => info.getValue<boolean>().toString(),
					size: 160,
				},
				{
					id: "posY",
					accessorFn: (row) => row.posY,
					cell: (info) => info.getValue<boolean>().toString(),
					size: 160,
				},
			],
			hiddenColumnDef: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
			defaultSort: {
				id: "name",
				desc: false,
			},
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {
				treeType: (field, dictionary) => {
					return (
						<Input
							title={dictionary.fields.treeType.key}
							description={dictionary.fields.treeType.formFieldDescription}
							validationMessage={fieldInfo(field())}
							class="border-dividing-color bg-primary-color rounded-md border w-full"
						>
							<Select
								value={field().state.value.treeType || ""}
								setValue={(v) => {
									field().setValue(v);
								}}
								options={[
									...SKILL_TREE_TYPE.map((type) => ({
										label: dictionary.fields.treeType.enumMap[type],
										value: type,
									})),
								]}
								placeholder={field().state.value.treeType}
								// optionPosition="top"
							/>
						</Input>
					);
				},
			},
		},
		card: {
			hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
			fieldGenerator: {},
		},
	},
	skill_effect: {
		fieldGroupMap: {
			启用条件: ["condition"],
			基本信息: [
				"hpCost",
				"mpCost",
				"startupFrames",
				"castingRange",
				"effectiveRange",
				"motionFixed",
				"motionModified",
				"chantingFixed",
				"chantingModified",
				"reservoirFixed",
				"reservoirModified",
			],
			详细信息: ["description", "details"],
			其他信息: ["elementLogic"],
			技能逻辑: ["logic"],
		},
		table: {
			columnsDef: [
				{
					accessorKey: "castingRange",
					cell: (info) => info.getValue(),
					size: 100,
				},
				{
					accessorKey: "effectiveRange",
					cell: (info) => info.getValue(),
					size: 100,
				},
				{
					accessorKey: "motionFixed",
					cell: (info) => info.getValue(),
					size: 100,
				},
				{
					accessorKey: "motionModified",
					cell: (info) => info.getValue(),
					size: 100,
				},
				{
					accessorKey: "chantingFixed",
					cell: (info) => info.getValue(),
					size: 100,
				},
				{
					accessorKey: "chantingModified",
					cell: (info) => info.getValue(),
					size: 100,
				},
				{
					accessorKey: "reservoirFixed",
					cell: (info) => info.getValue(),
					size: 100,
				},
				{
					accessorKey: "reservoirModified",
					cell: (info) => info.getValue(),
					size: 100,
				},
			],
			hiddenColumnDef: ["id", "belongToskillId"],
			defaultSort: { id: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id", "belongToskillId"],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: ["id", "belongToskillId"],
			fieldGenerator: {
				logic: (field) => {
					return (
						<div class="w-full h-[50vh] rounded overflow-hidden">
							<BtEditor
								initValues={{
									definition: field.logic.definition ?? "",
									agent: field.logic.agent ?? "",
									memberType: field.logic.memberType ?? "Player",
								}}
								readOnly={true}
								onSave={(mdsl, agent, memberType) => {
									console.log(mdsl, agent, memberType);
								}}
							/>
						</div>
					);
				},
			},
		},
	},
	special: {
		fieldGroupMap: {
			基本信息: ["name", "baseAbi"],
			其他属性: ["modifiers"],
		},
		table: {
			columnsDef: [
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
				{
					accessorKey: "modifiers",
					cell: (info) => info.getValue(),
					size: 150,
				},
			],
			hiddenColumnDef: ["itemId"],
			defaultSort: { id: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {},
		},
	},
	task: {
		fieldGroupMap: {
			基本信息: ["name", "lv", "type", "description"],
		},
		table: {
			columnsDef: [
				{
					id: "id",
					accessorFn: (row) => row.id,
					cell: (info) => info.getValue(),
					size: 200,
				},
				{
					id: "name",
					accessorFn: (row) => row.name,
					cell: (info) => info.getValue(),
					size: 220,
				},
				{
					id: "lv",
					accessorFn: (row) => row.lv,
					cell: (info) => info.getValue<number | null>(),
					size: 120,
				},
				{
					id: "type",
					accessorFn: (row) => row.type,
					cell: (info) => info.getValue<string | null>(),
					size: 160,
				},
				{
					id: "description",
					accessorFn: (row) => row.description,
					cell: (info) => info.getValue<string | null>(),
					size: 160,
				},
			],
			hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId", "belongToNpcId"],
			defaultSort: { id: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {},
		},
	},
	weapon: {
		fieldGroupMap: {
			基本信息: ["name", "baseAbi", "stability", "elementType"],
			其他属性: ["modifiers"],
			颜色信息: ["colorA", "colorB", "colorC"],
		},
		table: {
			columnsDef: [
				{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
				{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
				{
					accessorKey: "stability",
					cell: (info) => info.getValue(),
					size: 100,
				},
				{
					accessorKey: "elementType",
					cell: (info) => info.getValue<ElementType>(),
					size: 150,
				},
				// { accessorKey: "modifiers", cell: (info) => info.getValue(), size: 400 },
				{ accessorKey: "colorA", cell: (info) => info.getValue(), size: 150 },
				{ accessorKey: "colorB", cell: (info) => info.getValue(), size: 150 },
				{ accessorKey: "colorC", cell: (info) => info.getValue(), size: 150 },
			],
			hiddenColumnDef: ["itemId"],
			defaultSort: {
				id: "name",
				desc: false,
			},
			tdGenerator: {
				elementType: (props) =>
					({
						Water: <Icons.Game.ElementWater class="h-12 w-12" />,
						Fire: <Icons.Game.ElementFire class="h-12 w-12" />,
						Earth: <Icons.Game.ElementEarth class="h-12 w-12" />,
						Wind: <Icons.Game.ElementWind class="h-12 w-12" />,
						Light: <Icons.Game.ElementLight class="h-12 w-12" />,
						Dark: <Icons.Game.ElementDark class="h-12 w-12" />,
						Normal: <Icons.Game.ElementNoElement class="h-12 w-12" />,
					})[props.cell.getValue<ElementType>()],
			},
		},
		form: {
			hiddenFields: [],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: [],
			fieldGenerator: {},
		},
	},
	world: {
		fieldGroupMap: {
			基本信息: ["name"],
		},
		table: {
			columnsDef: [{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 }],
			hiddenColumnDef: [],
			defaultSort: { id: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			fieldGenerator: {},
		},
	},
	zone: {
		fieldGroupMap: {
			基本信息: ["name", "rewardNodes"],
		},
		table: {
			columnsDef: [
				{
					id: "id",
					accessorFn: (row) => row.id,
					cell: (info) => info.getValue(),
					size: 200,
				},
				{
					id: "name",
					accessorFn: (row) => row.name,
					cell: (info) => info.getValue(),
					size: 220,
				},
				{
					id: "rewardNodes",
					accessorFn: (row) => row.rewardNodes,
					cell: (info) => info.getValue<number | null>(),
					size: 120,
				},
				{
					id: "activityId",
					accessorFn: (row) => row.activityId,
					cell: (info) => info.getValue<string | null>(),
					size: 160,
				},
				{
					id: "addressId",
					accessorFn: (row) => row.addressId,
					cell: (info) => info.getValue<string>(),
					size: 160,
				},
			],
			hiddenColumnDef: ["id", "activityId", "addressId", "createdByAccountId", "updatedByAccountId", "statisticId"],
			defaultSort: { id: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			fieldGenerator: {},
		},
		card: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
			fieldGenerator: {},
		},
	},
};
