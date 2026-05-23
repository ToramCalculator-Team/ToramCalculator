import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { SkillVariantSchema, type skill_variant } from "@db/generated/zod";
import type { TableDataConfig } from "../data-config";

const formatJson = (value: unknown): string => JSON.stringify(value ?? null, null, 2);

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
		释放门槛: ["hpCost", "mpCost"],
		默认行为: ["activeBehavior", "passiveBehavior", "registeredBehavior"],
		详细信息: ["description", "details"],
	},
	table: {
		columnsDef: [
			{
				accessorKey: "description",
				cell: (info) => info.getValue(),
				size: 240,
			},
			{
				accessorKey: "mpCost",
				cell: (info) => info.getValue(),
				size: 120,
			},
			{
				accessorKey: "hpCost",
				cell: (info) => info.getValue(),
				size: 120,
			},
		],
		hiddenColumnDef: ["id", "belongToskillId", "activeBehavior", "passiveBehavior", "registeredBehavior"],
		defaultSort: { field: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id"],
		renderers: {
			containers: {
				"activeBehavior.behaviorParams.damageEvents": (context) =>
					context.renderFrame({
						children: () => <div class="flex gap-2 p-1 bg-area-color rounded">{context.children()}</div>,
					}),
			},
		},
		onInsert: repositoryMethods.skill_variant.insert,
		onUpdate: repositoryMethods.skill_variant.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {
			activeBehavior: (field, key) => (
				<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(field[key])}</pre>
			),
			passiveBehavior: (field, key) => (
				<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(field[key])}</pre>
			),
			registeredBehavior: (field, key) => (
				<pre class="bg-area-color max-h-[50vh] w-full overflow-auto rounded p-3 text-sm">{formatJson(field[key])}</pre>
			),
		},
		deleteCallback: repositoryMethods.skill_variant.delete,
		editAbleCallback: (data) => repositoryMethods.skill_variant.canEdit(data.id),
	},
});
