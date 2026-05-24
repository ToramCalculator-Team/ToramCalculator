import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { selectAllSkillVariantsByBelongtoskillid } from "@db/generated/repositories/skill_variant";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { SkillSchema, type skill } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { SKILL_TREE_TYPE, type SkillTreeType } from "@db/schema/enums";
import { createId } from "@paralleldrive/cuid2";
import z from "zod/v4";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import type { TableDataConfig } from "../data-config";
import { DefaultFieldClass } from "../form/SchemaFieldRenderer";
import { getUserContext } from "../utils/context";
import {
	deleteSkillVariantEditor,
	SkillVariantEditorSchema,
	saveSkillVariantEditor,
	selectSkillVariantEditorsByBelongToskillid,
} from "./skill_variant";

const SkillWithVariantsSchema = SkillSchema.extend({
	variants: z.array(SkillVariantEditorSchema),
});

type SkillWithVariants = z.output<typeof SkillWithVariantsSchema>;
type SkillListRow = skill;

const defaultDataWithVariants: SkillWithVariants = {
	...defaultData.skill,
	variants: [],
};

const getSkillWithVariants = async (id: string): Promise<SkillWithVariants> => {
	const db = await getDB();
	const skill = await db.selectFrom("skill").where("skill.id", "=", id).selectAll("skill").executeTakeFirstOrThrow();
	return {
		...skill,
		variants: await selectSkillVariantEditorsByBelongToskillid(id),
	};
};

const getAllSkillWithVariants = async (): Promise<SkillWithVariants[]> => {
	const db = await getDB();
	const skills = await db.selectFrom("skill").selectAll("skill").execute();
	return await Promise.all(
		skills.map(async (skill) => ({
			...skill,
			variants: await selectSkillVariantEditorsByBelongToskillid(skill.id),
		})),
	);
};

const insertSkillWithVariants = async (data: SkillWithVariants): Promise<SkillWithVariants> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const statistic = await insertStatistic(
			{
				...defaultData.statistic,
				id: createId(),
			},
			trx,
		);
		const { account } = await getUserContext(trx);
		const skillData = SkillSchema.parse(data);
		const skill = await repositoryMethods.skill.insert(
			{
				...skillData,
				id: createId(),
				statisticId: statistic.id,
				createdByAccountId: account.id,
				updatedByAccountId: account.id,
			},
			trx,
		);
		const variants = await Promise.all(
			data.variants.map((variant) =>
				saveSkillVariantEditor(
					{
						...variant,
						belongToskillId: skill.id,
					},
					trx,
					skill.id,
				),
			),
		);
		return {
			...skill,
			variants,
		};
	});
};

const updateSkillWithVariants = async (id: string, data: SkillWithVariants): Promise<SkillWithVariants> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const skillData = SkillSchema.parse(data);
		const skill = await repositoryMethods.skill.update(id, skillData, trx);

		// 表单里的 variants 是 skill 的完整子表快照：
		// - 已存在的变体需要 update；
		// - 表单新增的变体已经在 FormRenderer 中分配了真实 id，但数据库里还没有，需要 insert；
		// - 从表单数组移除的变体也要同步删除，避免界面上删了但数据库仍残留。
		const existingVariants = await selectAllSkillVariantsByBelongtoskillid(id, trx);
		const submittedIds = new Set(data.variants.map((variant) => variant.id));
		await Promise.all(
			existingVariants
				.filter((variant) => !submittedIds.has(variant.id))
				.map((variant) => deleteSkillVariantEditor(variant.id, trx)),
		);

		const variants = await Promise.all(
			data.variants.map((variant) =>
				saveSkillVariantEditor(
					{
						...variant,
						belongToskillId: id,
					},
					trx,
					id,
				),
			),
		);
		return {
			...skill,
			variants,
		};
	});
};

const deleteSkillWithVariants = async (id: string): Promise<SkillWithVariants | undefined> => {
	const db = await getDB();
	await db.transaction().execute(async (trx) => {
		const variants = await selectAllSkillVariantsByBelongtoskillid(id, trx);
		await Promise.all(
			variants.map(async (variant) => {
				return await deleteSkillVariantEditor(variant.id, trx);
			}),
		);
		await repositoryMethods.skill.delete(id, trx);
	});
	return undefined;
};
// 第二个类型参数 = 配置站点字典覆盖范围。声明 embeds 后，variants 字段不参与字典渲染，
// 因此这里只需提供 skill 自己字段的字典（子表 skill_variant 的字典由渲染器递归使用 skill_variant 的 dataConfig）。
export const SKILL_DATA_CONFIG: TableDataConfig<SkillWithVariants, skill, SkillListRow> = (dictionary) => ({
	// 声明 variants 是 skill 的内嵌子表（1:N）；渲染器会：
	//   - 卡片：内嵌展示为按钮列表
	//   - 表单：内嵌为数组编辑器（递归使用 skill_variant 自己的 dataConfig）
	//   - 把 variants 从普通字段渲染流程中剔除，避免被当作通用 array 处理

	embeds: [{ field: "variants", table: "skill_variant", via: "belongToskillId" }],
	dictionary: dictionary().db.skill,
	dataSchema: SkillWithVariantsSchema,
	primaryKey: "id",
	defaultData: defaultDataWithVariants,
	dataFetcher: {
		get: getSkillWithVariants,
		getAll: getAllSkillWithVariants,
		insert: insertSkillWithVariants,
		update: updateSkillWithVariants,
		delete: deleteSkillWithVariants,
		// 列表页只需要 skill 自身字段；variants 在打开详情或编辑时按主键读取完整实体。
		// 设计目的：避免 wiki 快速切页时把 skill_variant 子表聚合进每个列表行，降低 PGlite 初始订阅压力。
		liveQuery: (db) => db.selectFrom("skill").selectAll("skill"),
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "treeType", "tier", "posX", "posY"],
		技能属性: ["chargingType", "distanceType", "targetType", "isPassive"],
		其他信息: ["preSkillId", "dataSources", "details"],
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
		hiddenColumnDef: ["id", "preSkillId", "statisticId", "createdByAccountId", "updatedByAccountId"],
		defaultSort: {
			field: "name",
			desc: false,
		},
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		renderers: {
			fields: {
				treeType: ({ value, setValue, validationMessage }) => {
					const treeTypeDictionary = dictionary().db.skill.fields.treeType;
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
		onInsert: insertSkillWithVariants,
		onUpdate: updateSkillWithVariants,
	},
	card: {
		relationOverrides: {
			only: ["skill_variant"],
		},
		hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: deleteSkillWithVariants,
		editAbleCallback: (data) => repositoryMethods.skill.canEdit(data.id),
	},
});
