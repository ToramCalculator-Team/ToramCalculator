import type { skill } from "@db/generated/zod";
import { SKILL_TREE_TYPE, type SkillTreeType } from "@db/schema/enums";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { DefaultFieldClass } from "~/components/form/fields";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const SKILL_DATA_CONFIG: TableDataConfigurator<"skill", skill> = (dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["name", "treeType", "tier", "posX", "posY"],
			其他信息: ["preSkillId", "dataSources", "details"],
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
					size: 180,
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
				{
					id: "preSkillId",
					accessorFn: (row) => row.preSkillId,
					cell: (info) => info.getValue<string | null>(),
					size: 160,
				},
			],
			hiddenColumnDef: ["id", "preSkillId", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
			defaultSort: {
				field: "name",
				desc: false,
			},
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
			renderers: {
				fields: {
					treeType: ({ value, setValue, validationMessage }) => {
						const treeTypeDictionary = dictionary.db.skill.fields.treeType;
						return (
							<Input
								title={treeTypeDictionary.key}
								description={treeTypeDictionary.formFieldDescription}
								validationMessage={validationMessage}
								class={DefaultFieldClass}
							>
								<Select
									value={value() as SkillTreeType}
									setValue={(v) => setValue(v as SkillTreeType)}
									options={[
										...SKILL_TREE_TYPE.map((type) => ({
											label: treeTypeDictionary.enumMap[type],
											value: type,
										})),
									]}
									placeholder={value() as SkillTreeType}
									// optionPosition="top"
								/>
							</Input>
						);
					},
				},
			},
			references: [],
			referencedBy: [
				{
					relation: "skill_variant.belongToSkill",
					tableName: "skill_variant",
				},
			],
		},
		card: {
			hiddenFields: ["id"],
			references: [
				{
					relation: "preSkill",
					tableName: "skill",
				},
			],
			referencedBy: [
				{
					relation: "skill_variant.belongToSkill",
					tableName: "skill_variant",
				},
			],
		},
	}) satisfies TableDataConfig<"skill", skill>;
// TS只检查右侧函数能否赋值给左侧函数类型,函数返回值采用结构兼容规则。只要右侧返回对象至少具有目标类型要求的属性，就可以包含额外属性。所以用satisfies来约束返回值不能有额外字段
