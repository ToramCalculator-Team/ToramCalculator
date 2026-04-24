import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { deleteCrystal, insertCrystal, updateCrystal } from "@db/generated/repositories/crystal";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { CrystalSchema, type crystal, ItemSchema } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { Icons } from "~/components/icons";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const CrystalItemSchema = ItemSchema.extend(CrystalSchema.shape);
type CrystalItem = z.output<typeof CrystalItemSchema>;

const CrystalItemDefaultData: CrystalItem = {
	...defaultData.crystal,
	...defaultData.item,
};

const getCrystalItem = async (id: string): Promise<CrystalItem> => {
	const db = await getDB();
	const crystalRow = await db.selectFrom("crystal").where("itemId", "=", id).selectAll().executeTakeFirstOrThrow();
	const item = await db.selectFrom("item").where("id", "=", crystalRow.itemId).selectAll().executeTakeFirstOrThrow();
	return {
		...crystalRow,
		...item,
	};
};

const getAllCrystalItems = async (): Promise<CrystalItem[]> => {
	const db = await getDB();
	return await db
		.selectFrom("crystal")
		.innerJoin("item", (join) => join.onRef("crystal.itemId", "=", "item.id"))
		.selectAll()
		.execute();
};

const insertCrystalItem = async (data: CrystalItem): Promise<CrystalItem> => {
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
		const crystalRow = await insertCrystal(
			{
				...CrystalSchema.parse(data),
				itemId: item.id,
			},
			trx,
		);
		return {
			...crystalRow,
			...item,
		};
	});
};

const updateCrystalItem = async (id: string, data: Partial<CrystalItem>): Promise<CrystalItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const crystalRow = await updateCrystal(id, CrystalSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...crystalRow,
			...item,
		};
	});
};

const deleteCrystalItem = async (id: string): Promise<CrystalItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteCrystal(id, trx);
		await deleteItem(id, trx);
		return undefined;
	});
};

export const CRYSTAL_DATA_CONFIG: TableDataConfig<CrystalItem, crystal> = (dictionary) => ({
	inheritsFrom: { table: "item", via: "itemId" },
	relationOverrides: {
		hide: ["statistic", "account_create_data", "account_update_data"],
	},
	dictionary: dictionary().db.crystal,
	dataSchema: CrystalItemSchema,
	primaryKey: "itemId",
	defaultData: CrystalItemDefaultData,
	dataFetcher: {
		get: getCrystalItem,
		getAll: getAllCrystalItems,
		insert: insertCrystalItem,
		update: updateCrystalItem,
		delete: deleteCrystalItem,
		liveQuery: (db) =>
			db
				.selectFrom("crystal")
				.innerJoin("item", (join) => join.onRef("crystal.itemId", "=", "item.id"))
				.selectAll("item")
				.select(["crystal.itemId", "crystal.type", "crystal.modifiers"]),
	},
	fieldGroupMap: {
		基本信息: ["name", "type", "itemSourceType", "dataSources", "details", "modifiers"],
	},
	table: {
		measure: {
			estimateSize: 160,
		},
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{
				accessorKey: "modifiers",
				cell: (info) => info.getValue(),
				size: 480,
			},
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: async (values) => insertCrystalItem(values),
		onUpdate: updateCrystalItem,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {
			name: (data, key, dictionary) => {
				return (
					<div class="Field flex gap-2">
						<span class="text-main-text-color text-nowrap">{dictionary.fields[key].key}</span>:
						<span class="flex items-center gap-2 font-bold">
							<Icons.Spirits iconName={data.type} size={24} /> {String(data[key])}
						</span>
					</div>
				);
			},
		},
		deleteCallback: deleteCrystalItem,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "crystal", data }),
		editAbleCallback: (data) => repositoryMethods.crystal.canEdit(data.itemId),
	},
});
