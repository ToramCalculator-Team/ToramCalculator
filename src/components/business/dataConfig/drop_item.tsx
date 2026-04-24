import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { DropItemSchema, type drop_item } from "@db/generated/zod";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

export const DROP_ITEM_DATA_CONFIG: TableDataConfig<drop_item> = (dictionary) => ({
	dictionary: dictionary().db.drop_item,
	dataSchema: DropItemSchema,
	primaryKey: "id",
	defaultData: defaultData.drop_item,
	dataFetcher: {
		get: repositoryMethods.drop_item.select,
		getAll: repositoryMethods.drop_item.selectAll,
		liveQuery: (db) => db.selectFrom("drop_item").selectAll("drop_item"),
		insert: repositoryMethods.drop_item.insert,
		update: repositoryMethods.drop_item.update,
		delete: repositoryMethods.drop_item.delete,
	},
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
		fieldGenerator: {},
		onInsert: repositoryMethods.drop_item.insert,
		onUpdate: repositoryMethods.drop_item.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.drop_item.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "drop_item", data }),
		editAbleCallback: (data) => repositoryMethods.drop_item.canEdit(data.id),
	},
});
