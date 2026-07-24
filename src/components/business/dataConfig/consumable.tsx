import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import {
	deleteConsumableQuery,
	insertConsumableQuery,
	updateConsumableQuery,
} from "@db/generated/repositories/consumable";
import { deleteItemQuery, insertItemQuery, updateItemQuery } from "@db/generated/repositories/item";
import { ConsumableSchema, type consumable, ItemSchema } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import type { QueryDB, TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const ConsumableItemSchema = ItemSchema.extend(ConsumableSchema.shape);
type ConsumableItem = z.output<typeof ConsumableItemSchema>;

const ConsumableItemDefaultData: ConsumableItem = {
	...defaultData.consumable,
	...defaultData.item,
};

/**
 * 设计思路：consumable 在业务实体上继承 item 字段，列表订阅和详情读取必须共用同一条联合查询，避免列选择分裂。
 * 函数职责：构造 consumable 与 item 合并后的业务实体查询。
 */
const selectConsumableItemQuery = (db: QueryDB) =>
	db
		.selectFrom("consumable")
		.innerJoin("item", (join) => join.onRef("consumable.itemId", "=", "item.id"))
		.selectAll("item")
		.select(["consumable.itemId", "consumable.type", "consumable.effectDuration", "consumable.effects"]);

const insertConsumableItem = async (data: ConsumableItem): Promise<ConsumableItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);
		const item = await insertItemQuery(trx, {
			...ItemSchema.parse(data),
			id: createId(),
			createdByAccountId: account.id,
			updatedByAccountId: account.id,
		}).executeTakeFirstOrThrow();
		const consumableRow = await insertConsumableQuery(trx, {
			...ConsumableSchema.parse(data),
			itemId: item.id,
		}).executeTakeFirstOrThrow();
		return {
			...consumableRow,
			...item,
		};
	});
};

const updateConsumableItem = async (id: string, data: Partial<ConsumableItem>): Promise<ConsumableItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const consumableRow = await updateConsumableQuery(trx, id, ConsumableSchema.parse(data)).executeTakeFirstOrThrow();
		const item = await updateItemQuery(trx, id, ItemSchema.parse(data)).executeTakeFirstOrThrow();
		return {
			...consumableRow,
			...item,
		};
	});
};

const deleteConsumableItem = async (id: string): Promise<ConsumableItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteConsumableQuery(trx, id).executeTakeFirst();
		await deleteItemQuery(trx, id).executeTakeFirst();
		return undefined;
	});
};

export const CONSUMABLE_DATA_CONFIG: TableDataConfig<ConsumableItem, consumable> = (dictionary) => ({
	tableName: "consumable",
	inheritsFrom: { table: "item", via: "itemId" },
	dictionary: dictionary().db.consumable,
	dataSchema: ConsumableItemSchema,
	primaryKey: "itemId",
	defaultData: ConsumableItemDefaultData,
	queries: {
		get: (db, id) => selectConsumableItemQuery(db).where("consumable.itemId", "=", id),
		getAll: selectConsumableItemQuery,
		getParentsById: repositoryReaders.consumable.getParentsById,
		getChildrenById: repositoryReaders.consumable.getChildrenById,
	},
	fieldGroupMap: {
		基本信息: ["name", "type", "itemSourceType", "dataSources", "details"],
		效果信息: ["effects", "effectDuration"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
			{
				accessorKey: "effectDuration",
				cell: (info) => info.getValue(),
				size: 100,
			},
			{ accessorKey: "effects", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: [],
		onInsert: async (values) => insertConsumableItem(values),
		onUpdate: updateConsumableItem,
	},
	card: {
		relationOverrides: {
			hide: ["account_create_data", "account_update_data"],
		},
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteConsumableItem,
		editAbleCallback: (data) => repositoryWriters.consumable.canEdit(data.itemId),
	},
});
