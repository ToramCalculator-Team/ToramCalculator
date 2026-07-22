import { defaultData } from "@db/defaultData";
import { repositoryMethods, repositoryQueries } from "@db/generated/repositories";
import { deleteCrystal, insertCrystal, updateCrystal } from "@db/generated/repositories/crystal";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { CrystalSchema, type crystal, ItemSchema } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import { Icons } from "~/components/icons";
import type { QueryDB, TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const CrystalItemSchema = ItemSchema.extend(CrystalSchema.shape);
type CrystalItem = z.output<typeof CrystalItemSchema>;

const CrystalItemDefaultData: CrystalItem = {
	...defaultData.crystal,
	...defaultData.item,
};

/**
 * 设计思路：crystal 在业务实体上继承 item 字段，列表订阅和详情读取必须共用同一条联合查询，避免列选择分裂。
 * 函数职责：构造 crystal 与 item 合并后的业务实体查询。
 */
const selectCrystalItemQuery = (db: QueryDB) =>
	db
		.selectFrom("crystal")
		.innerJoin("item", (join) => join.onRef("crystal.itemId", "=", "item.id"))
		.selectAll("item")
		.select(["crystal.itemId", "crystal.type", "crystal.modifiers"]);

const insertCrystalItem = async (data: CrystalItem): Promise<CrystalItem> => {
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
	dictionary: dictionary().db.crystal,
	dataSchema: CrystalItemSchema,
	primaryKey: "itemId",
	defaultData: CrystalItemDefaultData,
	queries: {
		get: (db, id) => selectCrystalItemQuery(db).where("crystal.itemId", "=", id),
		getAll: selectCrystalItemQuery,
		getParentsById: repositoryQueries.crystal.getParentsById,
		getChildrenById: repositoryQueries.crystal.getChildrenById,
	},
	fieldGroupMap: {
		基本信息: ["name", "type", "itemSourceType", "dataSources", "details", "modifiers"],
	},
	table: {
		measure: {
			estimateSize: 160,
		},
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 260 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{
				accessorKey: "modifiers",
				cell: (info) => info.getValue(),
				size: 480,
			},
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 180 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
			name: ({ cell, dic }) => (
				<div class="text-accent-color flex items-center gap-2">
					<div class="flex-none w-12 h-12 p-1 flex items-center justify-center rounded bg-area-color">
						<Icons.Spirits iconName={cell.row.original.type} size={36} />
					</div>
					<span>{cell.getValue<string>()}</span>
				</div>
			),
		},
	},
	form: {
		hiddenFields: [],
		onInsert: async (values) => insertCrystalItem(values),
		onUpdate: updateCrystalItem,
	},
	card: {
		relationOverrides: {
			hide: ["account_create_data", "account_update_data"],
		},
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
		editAbleCallback: (data) => repositoryMethods.crystal.canEdit(data.itemId),
	},
});
