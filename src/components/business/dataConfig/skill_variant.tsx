import type { skill_variant } from "@db/generated/zod";
import type { JSX } from "solid-js/jsx-runtime";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

const formatJson = (value: unknown): string => JSON.stringify(value ?? null, null, 2);

const renderJsonField = (title: string | undefined, value: unknown): JSX.Element => (
	<div class="Field flex flex-col gap-2">
		<span class="Title text-main-text-color text-nowrap">{title}</span>
		<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(value)}</pre>
	</div>
);

export const SKILL_VARIANT_DATA_CONFIG: TableDataConfigurator<"skill_variant", skill_variant> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["targetMainWeaponType", "targetSubWeaponType", "targetArmorAbilityType", "comboCompatible"],
			消耗与范围: ["hpCost", "mpCost", "range"],
			时间参数: [
				"castTimeType",
				"distanceType",
				"targetType",
				"chantingFixedMs",
				"chantingModifiedMs",
				"chargingFixedMs",
				"chargingModifiedMs",
				"actionFixedMs",
				"actionModifiedMs",
				"startupRatio",
			],
			"默认行为 DSL": ["activeBehavior", "passiveBehavior", "registeredBehavior"],
			其他: ["description", "details"],
			关联: ["belongToskillId"],
		},
		table: {
			columnsDef: [
				{ id: "id", accessorFn: (row) => row.id, cell: (info) => info.getValue(), size: 200 },
				{
					id: "targetMainWeaponType",
					accessorFn: (row) => row.targetMainWeaponType,
					cell: (info) => info.getValue(),
					size: 180,
				},
				{
					id: "targetSubWeaponType",
					accessorFn: (row) => row.targetSubWeaponType,
					cell: (info) => info.getValue(),
					size: 180,
				},
				{ id: "description", accessorFn: (row) => row.description, cell: (info) => info.getValue(), size: 240 },
			],
			hiddenColumnDef: ["id", "belongToskillId"],
			defaultSort: { field: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id", "belongToskillId"],
			references: [
				{
					relation: "belongToSkill",
					tableName: "skill",
				},
			],
			referencedBy: [],
		},
		card: {
			hiddenFields: ["id", "belongToskillId"],
			references: [
				{
					relation: "belongToSkill",
					tableName: "skill",
				},
			],
			referencedBy: [
				{
					relation: "behavior_tree.activeOwner",
					tableName: "behavior_tree",
				},
				{
					relation: "behavior_tree.passiveOwner",
					tableName: "behavior_tree",
				},
				{
					relation: "behavior_tree.registeredOwner",
					tableName: "behavior_tree",
				},
			],
			renderers: {
				fields: {
					activeBehavior: ({ value, dictionary }) => renderJsonField(dictionary?.key, value()),
					passiveBehavior: ({ value, dictionary }) => renderJsonField(dictionary?.key, value()),
					registeredBehavior: ({ value, dictionary }) => renderJsonField(dictionary?.key, value()),
				},
			},
		},
	}) satisfies TableDataConfig<"skill_variant", skill_variant>;
