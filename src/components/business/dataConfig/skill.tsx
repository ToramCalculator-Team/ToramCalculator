import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { selectAllSkillVariantsByBelongtoskillid } from "@db/generated/repositories/skill_variant";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { SkillSchema, SkillVariantSchema, type skill } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { SKILL_TREE_TYPE, type SkillTreeType } from "@db/schema/enums";
import { createId } from "@paralleldrive/cuid2";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import z from "zod/v4";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const SkillWithVariantsSchema = SkillSchema.extend({
	variants: z.array(SkillVariantSchema),
});

type SkillWithVariants = z.output<typeof SkillWithVariantsSchema>;

const defaultDataWithVariants: SkillWithVariants = {
	...defaultData.skill,
	variants: [],
};

const getSkillWithVariants = async (id: string): Promise<SkillWithVariants> => {
	const db = await getDB();
	const res = await db
		.selectFrom("skill")
		.selectAll("skill")
		.select((eb) => [
			jsonArrayFrom(
				eb
					.selectFrom("skill_variant")
					.whereRef("skill_variant.belongToskillId", "=", "skill.id")
					.selectAll("skill_variant"),
			).as("variants"),
		])
		.where("skill.id", "=", id)
		.executeTakeFirstOrThrow();
	return res;
};

const getAllSkillWithVariants = async (): Promise<SkillWithVariants[]> => {
	const db = await getDB();
	const res = await db
		.selectFrom("skill")
		.selectAll("skill")
		.select((eb) => [
			jsonArrayFrom(
				eb
					.selectFrom("skill_variant")
					.whereRef("skill_variant.belongToskillId", "=", "skill.id")
					.selectAll("skill_variant"),
			).as("variants"),
		])
		.execute();
	return res;
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
			data.variants.map(async (variant) => {
				const variantData = SkillVariantSchema.parse(variant);
				return await repositoryMethods.skill_variant.insert({
					...variantData,
					id: createId(),
					belongToskillId: skill.id,
				}, trx);
			}),
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
		const variants = await Promise.all(
			data.variants.map(async (variant) => {
				const variantData = SkillVariantSchema.parse(variant);
				return await repositoryMethods.skill_variant.update(variant.id, variantData, trx);
			}),
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
		await repositoryMethods.skill.delete(id, trx);
		const variants = await selectAllSkillVariantsByBelongtoskillid(id, trx);
		await Promise.all(
			variants.map(async (variant) => {
				return await repositoryMethods.skill_variant.delete(variant.id, trx);
			}),
		);
	});
	return undefined;
};
// 第二个类型参数 = 配置站点字典覆盖范围。声明 embeds 后，variants 字段不参与字典渲染，
// 因此这里只需提供 skill 自己字段的字典（子表 skill_variant 的字典由渲染器递归使用 skill_variant 的 dataConfig）。
export const SKILL_DATA_CONFIG: TableDataConfig<SkillWithVariants, skill> = (dictionary) => ({
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
		// 与 getAllSkillWithVariants 同款 jsonArrayFrom 子查询，仅去掉 .execute()；
		// skill 或 skill_variant 任意变动都会触发刷新
		liveQuery: (db) =>
			db
				.selectFrom("skill")
				.selectAll("skill")
				.select((eb) => [
					jsonArrayFrom(
						eb
							.selectFrom("skill_variant")
							.whereRef("skill_variant.belongToskillId", "=", "skill.id")
							.selectAll("skill_variant"),
					).as("variants"),
				]),
	},
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
		onInsert: insertSkillWithVariants,
		onUpdate: updateSkillWithVariants,
	},
	card: {
		hiddenFields: ["id", "statisticId", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: deleteSkillWithVariants,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "skill", data }),
		editAbleCallback: (data) => repositoryMethods.skill.canEdit(data.id),
	},
});
