import { defaultData } from "@db/defaultData";
import { repositoryMethods, repositoryQueries } from "@db/generated/repositories";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { deleteMaterial, insertMaterial, updateMaterial } from "@db/generated/repositories/material";
import { ItemSchema, MaterialSchema, type material } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import type { QueryDB, TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const MaterialItemSchema = ItemSchema.extend(MaterialSchema.shape);
type MaterialItem = z.output<typeof MaterialItemSchema>;

const MaterialItemDefaultData: MaterialItem = {
	...defaultData.material,
	...defaultData.item,
};

/**
 * 设计思路：material 在业务实体上继承 item 字段，列表订阅和详情读取必须共用同一条联合查询，避免列选择分裂。
 * 函数职责：构造 material 与 item 合并后的业务实体查询。
 */
const selectMaterialItemQuery = (db: QueryDB) =>
	db
		.selectFrom("material")
		.innerJoin("item", (join) => join.onRef("material.itemId", "=", "item.id"))
		.selectAll("item")
		.select(["material.itemId", "material.type", "material.ptValue", "material.price"]);

const insertMaterialItem = async (data: MaterialItem): Promise<MaterialItem> => {
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
		const materialRow = await insertMaterial(
			{
				...MaterialSchema.parse(data),
				itemId: item.id,
			},
			trx,
		);
		return {
			...materialRow,
			...item,
		};
	});
};

const updateMaterialItem = async (id: string, data: Partial<MaterialItem>): Promise<MaterialItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const materialRow = await updateMaterial(id, MaterialSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...materialRow,
			...item,
		};
	});
};

const deleteMaterialItem = async (id: string): Promise<MaterialItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteMaterial(id, trx);
		await deleteItem(id, trx);
		return undefined;
	});
};

export const MATERIAL_DATA_CONFIG: TableDataConfig<MaterialItem, material> = (dictionary) => ({
	inheritsFrom: { table: "item", via: "itemId" },
	dictionary: dictionary().db.material,
	dataSchema: MaterialItemSchema,
	primaryKey: "itemId",
	defaultData: MaterialItemDefaultData,
	queries: {
		get: (db, id) => selectMaterialItemQuery(db).where("material.itemId", "=", id),
		getAll: selectMaterialItemQuery,
		getParentsById: repositoryQueries.material.getParentsById,
		getChildrenById: repositoryQueries.material.getChildrenById,
	},
	fieldGroupMap: {
		基本信息: ["name", "type", "price", "ptValue", "itemSourceType", "dataSources", "details"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "price", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "ptValue", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: [],
		onInsert: async (values) => insertMaterialItem(values),
		onUpdate: updateMaterialItem,
	},
	card: {
		relationOverrides: {
			hide: ["account_create_data", "account_update_data"],
		},
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteMaterialItem,
		editAbleCallback: (data) => repositoryMethods.material.canEdit(data.itemId),
	},
});
