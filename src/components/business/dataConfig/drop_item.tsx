import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { DropItemSchema, type drop_item } from "@db/generated/zod";
import type { TableDataConfig } from "../data-config";

export const DROP_ITEM_DATA_CONFIG: TableDataConfig<drop_item> = (dictionary) => ({
	tableName: "drop_item",
	dictionary: dictionary().db.drop_item,
	dataSchema: DropItemSchema,
	primaryKey: "id",
	defaultData: defaultData.drop_item,
	queries: repositoryReaders.drop_item,
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["probability", "relatedPartType", "relatedPartInfo", "breakRewardType"],
		对应道具: ["itemId"],
		所属怪物: ["belongToMobId"],
	},
	table: {
		columnsDef: [],
		hiddenColumnDef: [],
		defaultSort: { field: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id"],
		onInsert: repositoryWriters.drop_item.create,
		onUpdate: repositoryWriters.drop_item.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryWriters.drop_item.delete,
		editAbleCallback: (data) => repositoryWriters.drop_item.canEdit(data.id),
	},
});
