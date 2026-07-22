import { defaultData } from "@db/defaultData";
import { repositoryMethods, repositoryQueries } from "@db/generated/repositories";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { deleteOption, insertOption, updateOption } from "@db/generated/repositories/option";
import { ItemSchema, OptionSchema, type option } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import type { QueryDB, TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const OptionItemSchema = ItemSchema.extend(OptionSchema.shape);
type OptionItem = z.output<typeof OptionItemSchema>;

const OptionItemDefaultData: OptionItem = {
	...defaultData.option,
	...defaultData.item,
};

/**
 * 设计思路：option 在业务实体上继承 item 字段，列表订阅和详情读取必须共用同一条联合查询，避免列选择分裂。
 * 函数职责：构造 option 与 item 合并后的业务实体查询。
 */
const selectOptionItemQuery = (db: QueryDB) =>
	db
		.selectFrom("option")
		.innerJoin("item", (join) => join.onRef("option.itemId", "=", "item.id"))
		.selectAll("item")
		.select(["option.itemId", "option.baseAbi", "option.modifiers", "option.colorA", "option.colorB", "option.colorC"]);

const insertOptionItem = async (data: OptionItem): Promise<OptionItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);
		const item = await insertItem(
			{
				...ItemSchema.parse(data),
				id: createId(),
				createdByAccountId: account.id,
				updatedByAccountId: account.id,
			},
			trx,
		);
		const optionRow = await insertOption(
			{
				...OptionSchema.parse(data),
				itemId: item.id,
			},
			trx,
		);
		return {
			...optionRow,
			...item,
		};
	});
};

const updateOptionItem = async (id: string, data: Partial<OptionItem>): Promise<OptionItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const optionRow = await updateOption(id, OptionSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...optionRow,
			...item,
		};
	});
};

const deleteOptionItem = async (id: string): Promise<OptionItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteOption(id, trx);
		await deleteItem(id, trx);
		return undefined;
	});
};

export const OPTION_DATA_CONFIG: TableDataConfig<OptionItem, option> = (dictionary) => ({
	inheritsFrom: { table: "item", via: "itemId" },
	dictionary: dictionary().db.option,
	dataSchema: OptionItemSchema,
	primaryKey: "itemId",
	defaultData: OptionItemDefaultData,
	queries: {
		get: (db, id) => selectOptionItemQuery(db).where("option.itemId", "=", id),
		getAll: selectOptionItemQuery,
		getParentsById: repositoryQueries.option.getParentsById,
		getChildrenById: repositoryQueries.option.getChildrenById,
	},
	fieldGroupMap: {
		基本信息: ["name", "baseAbi", "itemSourceType", "dataSources", "details"],
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
			field: "name",
			desc: false,
		},
		tdGenerator: {
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
		},
	},
	form: {
		hiddenFields: [],
		onInsert: async (values) => insertOptionItem(values),
		onUpdate: updateOptionItem,
	},
	card: {
		relationOverrides: {
			hide: ["player_option", "account_create_data", "account_update_data"],
		},
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteOptionItem,
		editAbleCallback: (data) => repositoryMethods.option.canEdit(data.itemId),
	},
});
