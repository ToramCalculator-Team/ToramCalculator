import { defaultData } from "@db/defaultData";
import { repositoryMethods, repositoryQueries } from "@db/generated/repositories";
import { deleteArmor, insertArmor, updateArmor } from "@db/generated/repositories/armor";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { insertStatistic } from "@db/generated/repositories/statistic";
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
		const armorRow = await insertArmor(
			{
				...ArmorSchema.parse(data),
				itemId: item.id,
			},
			trx,
		);
		return {
			...armorRow,
			...item,
		};
	});
};

const updateArmorItem = async (id: string, data: Partial<ArmorItem>): Promise<ArmorItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const armorRow = await updateArmor(id, ArmorSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...armorRow,
			...item,
		};
	});
};

const deleteArmorItem = async (id: string): Promise<ArmorItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteArmor(id, trx);
		await deleteItem(id, trx);
		return undefined;
	});
};

export const ARMOR_DATA_CONFIG: TableDataConfig<ArmorItem, armor> = (dictionary) => ({
	inheritsFrom: { table: "item", via: "itemId" },
	dictionary: dictionary().db.armor,
	dataSchema: ArmorItemSchema,
	primaryKey: "itemId",
	defaultData: ArmorItemDefaultData,
	queries: {
		get: (db, id) => selectArmorItemQuery(db).where("armor.itemId", "=", id),
		getAll: selectArmorItemQuery,
		getParentsById: repositoryQueries.armor.getParentsById,
		getChildrenById: repositoryQueries.armor.getChildrenById,
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
			hide: ["player_armor", "statistic", "account_create_data", "account_update_data"],
		},
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteArmorItem,
		editAbleCallback: (data) => repositoryMethods.armor.canEdit(data.itemId),
	},
});
