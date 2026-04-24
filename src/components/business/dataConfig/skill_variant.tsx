import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { SkillVariantSchema, type skill_variant } from "@db/generated/zod";
import type { MemberType } from "@db/schema/enums";
import type { MemberBTTree } from "@db/schema/jsons";
import { createEffect, createSignal, Index } from "solid-js";
import { BtEditorWrapper } from "~/components/business/utils/btEditorWrapper";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { BtEditor } from "~/components/features/BtEditor/BtEditor";
import { skillLogicExample } from "~/components/features/BtEditor/data/SkillExamples";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

export const SKILL_VARIANT_DATA_CONFIG: TableDataConfig<skill_variant> = (dictionary) => ({
	dictionary: dictionary().db.skill_variant,
	dataSchema: SkillVariantSchema,
	primaryKey: "id",
	defaultData: defaultData.skill_variant,
	dataFetcher: {
		get: repositoryMethods.skill_variant.select,
		getAll: repositoryMethods.skill_variant.selectAll,
		liveQuery: (db) => db.selectFrom("skill_variant").selectAll("skill_variant"),
		insert: repositoryMethods.skill_variant.insert,
		update: repositoryMethods.skill_variant.update,
		delete: repositoryMethods.skill_variant.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		启用条件: ["targetMainWeaponType", "targetSubWeaponType", "targetArmorAbilityType"],
		所属技能: ["belongToskillId"],
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
		技能效果: ["activeEffect", "passiveEffects", "buffs"],
		详细信息: ["description", "details"],
		其他信息: ["elementLogic"],
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
		defaultSort: { field: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id"],
		fieldGenerator: {
			activeEffect: (value, setValue, validationMessage, dictionary) => {
				const [editorDisplay, setEditorDisplay] = createSignal(false);
				return (
					<Input
						title={dictionary.fields.activeEffect.key}
						description={dictionary.fields.activeEffect.formFieldDescription}
						validationMessage={validationMessage}
						class="border-dividing-color bg-primary-color w-full rounded-md border"
					>
						<BtEditorWrapper
							title={dictionary.fields.activeEffect.key}
							editorDisplay={editorDisplay()}
							setEditorDisplay={setEditorDisplay}
						>
							<BtEditor
								title={dictionary.fields.activeEffect.key}
								initValues={{
									definition: value().definition ?? "",
									agent: value().agent ?? "",
									memberType: (value().memberType as MemberType) ?? "Player",
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
			passiveEffects: (value, setValue, validationMessage, dictionary) => {
				const arrayValue = () => (value() as MemberBTTree[]) ?? [];
				const [editorDisplay, setEditorDisplay] = createSignal<Array<boolean>>([]);

				// 让 editorDisplay 的长度始终与数组长度对齐（新增项默认 false）
				createEffect(() => {
					const len = arrayValue().length;
					setEditorDisplay((prev) => {
						const next = Array.from({ length: len }, (_, i) => prev[i] ?? false);
						if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
						return next;
					});
				});

				const setEditorDisplayAt = (i: number, v: boolean) => {
					setEditorDisplay((prev) => {
						const next = [...prev];
						next[i] = v;
						return next;
					});
				};
				return (
					<Input
						title={dictionary.fields.passiveEffects.key}
						description={dictionary.fields.passiveEffects.formFieldDescription}
						validationMessage={validationMessage}
						class="border-dividing-color bg-primary-color w-full rounded-md border"
					>
						<div class="ArrayBox flex w-full flex-col gap-2">
							<Index each={arrayValue()}>
								{(item, index) => (
									<div class="flex gap-1">
										<Input
											type="text"
											value={item().name}
											onChange={(e) => {
												const i = index;
												const next = arrayValue().slice();
												next[i] = { ...item(), name: e.target.value };
												setValue(next);
											}}
											class="w-full p-0! min-w-64"
										/>
										<BtEditorWrapper
											title={dictionary.fields.passiveEffects.key}
											editorDisplay={editorDisplay()[index] ?? false}
											setEditorDisplay={(v) => setEditorDisplayAt(index, v)}
										>
											<BtEditor
												title={dictionary.fields.passiveEffects.key}
												initValues={item()}
												onSave={(mdsl, agent, memberType) => {
													const newValue = {
														...item(),
														definition: mdsl,
														agent: agent,
														memberType: memberType,
													};
													const i = index;
													const next = arrayValue().slice();
													next[i] = newValue;
													setValue(next);
												}}
												onClose={() => setEditorDisplayAt(index, false)}
											/>
										</BtEditorWrapper>
										<Button
											onClick={(e) => {
												const i = index;
												setValue(arrayValue().filter((_, j) => j !== i));
												setEditorDisplay((prev) => prev.filter((_, j) => j !== i));
												e.stopPropagation();
											}}
										>
											-
										</Button>
									</div>
								)}
							</Index>
							<Button
								onClick={() => {
									setValue(arrayValue().concat(skillLogicExample.default));
								}}
								class="w-full"
							>
								+
							</Button>
						</div>
					</Input>
				);
			},
			buffs: (value, setValue, validationMessage, dictionary) => {
				const arrayValue = () => (value() as MemberBTTree[]) ?? [];
				const [editorDisplay, setEditorDisplay] = createSignal<Array<boolean>>([]);

				// 让 editorDisplay 的长度始终与数组长度对齐（新增项默认 false）
				createEffect(() => {
					const len = arrayValue().length;
					setEditorDisplay((prev) => {
						const next = Array.from({ length: len }, (_, i) => prev[i] ?? false);
						if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
						return next;
					});
				});

				const setEditorDisplayAt = (i: number, v: boolean) => {
					setEditorDisplay((prev) => {
						const next = [...prev];
						next[i] = v;
						return next;
					});
				};
				return (
					<Input
						title={dictionary.fields.buffs.key}
						description={dictionary.fields.buffs.formFieldDescription}
						validationMessage={validationMessage}
						class="border-dividing-color bg-primary-color w-full rounded-md border"
					>
						<div class="ArrayBox flex w-full flex-col gap-2">
							<Index each={arrayValue()}>
								{(item, index) => (
									<div class="flex gap-1">
										<Input
											type="text"
											value={item().name}
											onChange={(e) => {
												const i = index;
												const next = arrayValue().slice();
												next[i] = { ...item(), name: e.target.value };
												setValue(next);
											}}
											class="w-full p-0! min-w-64"
										/>
										<BtEditorWrapper
											title={dictionary.fields.buffs.key}
											editorDisplay={editorDisplay()[index] ?? false}
											setEditorDisplay={(v) => setEditorDisplayAt(index, v)}
										>
											<BtEditor
												title={dictionary.fields.buffs.key}
												initValues={item()}
												onSave={(mdsl, agent, memberType) => {
													const newValue = {
														...item(),
														definition: mdsl,
														agent: agent,
														memberType: memberType,
													};
													const i = index;
													const next = arrayValue().slice();
													next[i] = newValue;
													setValue(next);
												}}
												onClose={() => setEditorDisplayAt(index, false)}
											/>
										</BtEditorWrapper>
										<Button
											onClick={(e) => {
												const i = index;
												setValue(arrayValue().filter((_, j) => j !== i));
												setEditorDisplay((prev) => prev.filter((_, j) => j !== i));
												e.stopPropagation();
											}}
										>
											-
										</Button>
									</div>
								)}
							</Index>
							<Button
								onClick={() => {
									setValue(arrayValue().concat(skillLogicExample.default));
								}}
								class="w-full"
							>
								+
							</Button>
						</div>
					</Input>
				);
			},
		},
		onInsert: repositoryMethods.skill_variant.insert,
		onUpdate: repositoryMethods.skill_variant.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {
			activeEffect: (field, key, dictionary) => {
				return (
					<div class="w-full h-[50vh] rounded overflow-hidden">
						<BtEditor
							title={dictionary.fields[key].key}
							initValues={{
								definition: field.activeEffect.definition ?? "",
								agent: field.activeEffect.agent ?? "",
								memberType: field.activeEffect.memberType ?? "Player",
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
		deleteCallback: repositoryMethods.skill_variant.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "skill_variant", data }),
		editAbleCallback: (data) => repositoryMethods.skill_variant.canEdit(data.id),
	},
});
