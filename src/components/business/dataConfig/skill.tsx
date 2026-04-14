import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { getDB } from "@db/repositories/database";
import { SKILL_TREE_TYPE, type SkillTreeType } from "@db/schema/enums";
import { createId } from "@paralleldrive/cuid2";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import type { TableDataConfig } from "../data-config";

export const SKILL_DATA_CONFIG: TableDataConfig<"skill"> = {
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "treeType", "tier", "posX", "posY"],
		技能属性: ["chargingType", "distanceType", "targetType", "isPassive"],
		其他信息: ["dataSources", "details"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
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
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {
			treeType: (value, setValue, validationMessage, dictionary) => {
				return (
					<Input
						title={dictionary.fields.treeType.key}
						description={dictionary.fields.treeType.formFieldDescription}
						validationMessage={validationMessage}
						class="border-dividing-color bg-primary-color rounded-md border w-full"
					>
						<Select
							value={value()}
							setValue={(v) => setValue(v as SkillTreeType)}
							options={[
								...SKILL_TREE_TYPE.map((type) => ({
									label: dictionary.fields.treeType.enumMap[type],
									value: type,
								})),
							]}
							placeholder={value()}
							// optionPosition="top"
						/>
					</Input>
				);
			},
		},
		onInsert: async (skill) => {
			const db = await getDB();
			return await db.transaction().execute(async (trx) => {
				const statistic = await insertStatistic(
					{
						...defaultData.statistic,
						id: createId(),
					},
					trx,
				);
				skill.statisticId = statistic.id;
				return await repositoryMethods.skill.insert(skill, trx);
			});
		},
		onUpdate: repositoryMethods.skill.update,
	},
	card: {
		hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
	},
};
