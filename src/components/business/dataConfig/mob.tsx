import { repositoryMethods } from "@db/generated/repositories";
import type { ElementType, MemberType, MobType } from "@db/schema/enums";
import { MOB_DIFFICULTY_FLAG, type MobDifficultyFlag } from "@db/schema/enums";
import { createEffect, createSignal, Show } from "solid-js";
import { BtEditorWrapper } from "~/components/business/utils/btEditorWrapper";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { BtEditor } from "~/components/features/BtEditor/BtEditor";
import { Icons } from "~/components/icons";
import { generateBossDataByFlag } from "~/lib/utils/mob";
import { store } from "~/store";
import type { TableDataConfig } from "../data-config";

export const MOB_DATA_CONFIG: TableDataConfig<"mob"> = {
	fieldGroupMap: {
		ID: ["id"],
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
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
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
					"zh-CN": 200,
					"zh-TW": 200,
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
					"zh-CN": 120,
					"zh-TW": 120,
					ja: 120,
					en: 120,
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
		hiddenColumnDef: ["id", "type", "actions", "createdByAccountId", "updatedByAccountId"],
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
			name: ({ cell, dic }) => (
				<div class="text-accent-color flex flex-col items-start  justify-start gap-1">
					<span>{cell.getValue<string>()}</span>
					<span class="text-main-text-color text-xs">{dic.fields.type.enumMap[cell.row.original.type]}</span>
				</div>
			),
		},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {
			actions: (value, setValue, validationMessage, dictionary) => {
				const [editorDisplay, setEditorDisplay] = createSignal(false);
				return (
					<Input
						title={dictionary.fields.actions.key}
						description={dictionary.fields.actions.formFieldDescription}
						validationMessage={validationMessage}
						class="border-dividing-color bg-primary-color w-full rounded-md border"
					>
						<BtEditorWrapper
							title={dictionary.fields.actions.key}
							editorDisplay={editorDisplay()}
							setEditorDisplay={setEditorDisplay}
						>
							<BtEditor
								title={dictionary.fields.actions.key}
								initValues={{
									definition: value().definition ?? "",
									agent: value().agent ?? "",
									memberType: (value().memberType as MemberType) ?? "Mob",
								}}
								onSave={(mdsl, agent, memberType) => {
									const newValue = {
										...value(),
										definition: mdsl,
										agent: agent,
										memberType: memberType,
									};
									console.log(newValue);
									setValue(newValue);
									// setEditorDisplay(false);
								}}
								onClose={() => setEditorDisplay(false)}
							/>
						</BtEditorWrapper>
					</Input>
				);
			},
		},
		onInsert: repositoryMethods.mob.insert,
		onUpdate: repositoryMethods.mob.update,
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
												["Hard", "Lunatic", "Ultimate"].includes(option.value) ? "fill-brand-color-2nd!" : "fill-none!"
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
};
