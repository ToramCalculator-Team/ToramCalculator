import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { deleteItemQuery, insertItemQuery, updateItemQuery } from "@db/generated/repositories/item";
import { deleteSpecialQuery, insertSpecialQuery, updateSpecialQuery } from "@db/generated/repositories/special";
import { ItemSchema, SpecialSchema, type special } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import type { QueryDB, TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const SpecialItemSchema = ItemSchema.extend(SpecialSchema.shape);
type SpecialItem = z.output<typeof SpecialItemSchema>;

const SpecialItemDefaultData: SpecialItem = {
	...defaultData.special,
	...defaultData.item,
};

/**
 * 设计思路：special 在业务实体上继承 item 字段，列表订阅和详情读取必须共用同一条联合查询，避免列选择分裂。
 * 函数职责：构造 special 与 item 合并后的业务实体查询。
 */
const selectSpecialItemQuery = (db: QueryDB) =>
	db
		.selectFrom("special")
		.innerJoin("item", (join) => join.onRef("special.itemId", "=", "item.id"))
		.selectAll("item")
		.select(["special.itemId", "special.baseAbi", "special.modifiers"]);

const insertSpecialItem = async (data: SpecialItem): Promise<SpecialItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);
		const item = await insertItemQuery(trx, {
			...ItemSchema.parse(data),
			id: createId(),
			createdByAccountId: account.id,
			updatedByAccountId: account.id,
		}).executeTakeFirstOrThrow();
		const specialRow = await insertSpecialQuery(trx, {
			...SpecialSchema.parse(data),
			itemId: item.id,
		}).executeTakeFirstOrThrow();
		return {
			...specialRow,
			...item,
		};
	});
};

const updateSpecialItem = async (id: string, data: Partial<SpecialItem>): Promise<SpecialItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const specialRow = await updateSpecialQuery(trx, id, SpecialSchema.parse(data)).executeTakeFirstOrThrow();
		const item = await updateItemQuery(trx, id, ItemSchema.parse(data)).executeTakeFirstOrThrow();
		return {
			...specialRow,
			...item,
		};
	});
};

const deleteSpecialItem = async (id: string): Promise<SpecialItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteSpecialQuery(trx, id).executeTakeFirst();
		await deleteItemQuery(trx, id).executeTakeFirst();
		return undefined;
	});
};

export const SPECIAL_DATA_CONFIG: TableDataConfig<SpecialItem, special> = (dictionary) => ({
	tableName: "special",
	inheritsFrom: { table: "item", via: "itemId" },
	dictionary: dictionary().db.special,
	dataSchema: SpecialItemSchema,
	primaryKey: "itemId",
	defaultData: SpecialItemDefaultData,
	queries: {
		get: (db, id) => selectSpecialItemQuery(db).where("special.itemId", "=", id),
		getAll: selectSpecialItemQuery,
		getParentsById: repositoryReaders.special.getParentsById,
		getChildrenById: repositoryReaders.special.getChildrenById,
	},
	fieldGroupMap: {
		基本信息: ["name", "baseAbi", "itemSourceType", "dataSources", "details"],
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
		defaultSort: { field: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
		},
	},
	form: {
		hiddenFields: [],
		onInsert: async (values) => insertSpecialItem(values),
		onUpdate: updateSpecialItem,
	},
	card: {
		relationOverrides: {
			hide: ["player_special", "account_create_data", "account_update_data"],
		},
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteSpecialItem,
		editAbleCallback: (data) => repositoryWriters.special.canEdit(data.itemId),
	},
});
