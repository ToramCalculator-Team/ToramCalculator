import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { deleteMaterial, insertMaterial, updateMaterial } from "@db/generated/repositories/material";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { ItemSchema, MaterialSchema, type material } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const MaterialItemSchema = ItemSchema.extend(MaterialSchema.shape);
type MaterialItem = z.output<typeof MaterialItemSchema>;

const MaterialItemDefaultData: MaterialItem = {
	...defaultData.material,
	...defaultData.item,
};

const getMaterialItem = async (id: string): Promise<MaterialItem> => {
	const db = await getDB();
	const materialRow = await db.selectFrom("material").where("itemId", "=", id).selectAll().executeTakeFirstOrThrow();
	const item = await db.selectFrom("item").where("id", "=", materialRow.itemId).selectAll().executeTakeFirstOrThrow();
	return {
		...materialRow,
		...item,
	};
};

const getAllMaterialItems = async (): Promise<MaterialItem[]> => {
	const db = await getDB();
	return await db
		.selectFrom("material")
		.innerJoin("item", (join) => join.onRef("material.itemId", "=", "item.id"))
		.selectAll()
		.execute();
};

const insertMaterialItem = async (data: MaterialItem): Promise<MaterialItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);
		const statistic = await insertStatistic(
			{
				...defaultData.statistic,
				id: createId(),
			},
			trx,
		);
		const item = await insertItem(
			{
				...ItemSchema.parse(data),
				id: createId(),
				statisticId: statistic.id,
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
	relationOverrides: {
		hide: ["statistic", "account_create_data", "account_update_data"],
	},
	dictionary: dictionary().db.material,
	dataSchema: MaterialItemSchema,
	primaryKey: "itemId",
	defaultData: MaterialItemDefaultData,
	dataFetcher: {
		get: getMaterialItem,
		getAll: getAllMaterialItems,
		insert: insertMaterialItem,
		update: updateMaterialItem,
		delete: deleteMaterialItem,
		liveQuery: (db) =>
			db
				.selectFrom("material")
				.innerJoin("item", (join) => join.onRef("material.itemId", "=", "item.id"))
				.selectAll("item")
				.select(["material.itemId", "material.type", "material.ptValue", "material.price"]),
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
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: async (values) => insertMaterialItem(values),
		onUpdate: updateMaterialItem,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteMaterialItem,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "material", data }),
		editAbleCallback: (data) => repositoryMethods.material.canEdit(data.itemId),
	},
});
