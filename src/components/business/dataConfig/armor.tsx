import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { deleteArmorQuery, insertArmorQuery, updateArmorQuery } from "@db/generated/repositories/armor";
import { deleteItemQuery, insertItemQuery, updateItemQuery } from "@db/generated/repositories/item";
import { ArmorSchema, type armor, ItemSchema } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import type { QueryDB, TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const ArmorItemSchema = ItemSchema.extend(ArmorSchema.shape);
type ArmorItem = z.output<typeof ArmorItemSchema>;

const ArmorItemDefaultData: ArmorItem = {
	...defaultData.armor,
	...defaultData.item,
};

/**
 * 设计思路：armor 在业务实体上继承 item 字段，列表订阅和详情读取必须共用同一条联合查询，避免列选择分裂。
 * 函数职责：构造 armor 与 item 合并后的业务实体查询。
 */
const selectArmorItemQuery = (db: QueryDB) =>
	db
		.selectFrom("armor")
		.innerJoin("item", (join) => join.onRef("armor.itemId", "=", "item.id"))
		.selectAll("item")
		.select(["armor.itemId", "armor.baseAbi", "armor.modifiers", "armor.colorA", "armor.colorB", "armor.colorC"]);

const insertArmorItem = async (data: ArmorItem): Promise<ArmorItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);
		const item = await insertItemQuery(trx, {
			...ItemSchema.parse(data),
			id: createId(),
			createdByAccountId: account.id,
			updatedByAccountId: account.id,
		}).executeTakeFirstOrThrow();
		const armorRow = await insertArmorQuery(trx, {
			...ArmorSchema.parse(data),
			itemId: item.id,
		}).executeTakeFirstOrThrow();
		return {
			...armorRow,
			...item,
		};
	});
};

const updateArmorItem = async (id: string, data: Partial<ArmorItem>): Promise<ArmorItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const armorRow = await updateArmorQuery(trx, id, ArmorSchema.parse(data)).executeTakeFirstOrThrow();
		const item = await updateItemQuery(trx, id, ItemSchema.parse(data)).executeTakeFirstOrThrow();
		return {
			...armorRow,
			...item,
		};
	});
};

const deleteArmorItem = async (id: string): Promise<ArmorItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteArmorQuery(trx, id).executeTakeFirst();
		await deleteItemQuery(trx, id).executeTakeFirst();
		return undefined;
	});
};

export const ARMOR_DATA_CONFIG: TableDataConfig<ArmorItem, armor> = (dictionary) => ({
	tableName: "armor",
	inheritsFrom: { table: "item", via: "itemId" },
	dictionary: dictionary().db.armor,
	dataSchema: ArmorItemSchema,
	primaryKey: "itemId",
	defaultData: ArmorItemDefaultData,
	queries: {
		get: (db, id) => selectArmorItemQuery(db).where("armor.itemId", "=", id),
		getAll: selectArmorItemQuery,
		getParentsById: repositoryReaders.armor.getParentsById,
		getChildrenById: repositoryReaders.armor.getChildrenById,
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
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
		},
	},
	form: {
		hiddenFields: [],
		onInsert: async (values) => insertArmorItem(values),
		onUpdate: updateArmorItem,
	},
	card: {
		relationOverrides: {
			hide: ["player_armor", "account_create_data", "account_update_data"],
		},
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteArmorItem,
		editAbleCallback: (data) => repositoryWriters.armor.canEdit(data.itemId),
	},
});
