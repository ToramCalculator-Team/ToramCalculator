import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { ActivitySchema, type activity } from "@db/generated/zod";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const ACTIVITY_DATA_CONFIG: TableDataConfig<activity> = {
	dictionary: dictionary.db.activity,
	dataSchema: ActivitySchema,
	primaryKey: "id",
	defaultData: defaultData.activity,
	dataFetcher: {
		get: repositoryMethods.activity.select,
		getAll: repositoryMethods.activity.selectAll,
		insert: repositoryMethods.activity.insert,
		update: repositoryMethods.activity.update,
		delete: repositoryMethods.activity.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{
				accessorKey: "id",
				cell: (info) => info.getValue(),
				size: 200,
			},
			{
				accessorKey: "name",
				cell: (info) => info.getValue(),
				size: 220,
			},
		],
		hiddenColumnDef: ["id"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.activity.insert,
		onUpdate: repositoryMethods.activity.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.activity.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "activity", data }),
		editAbleCallback: (data) => repositoryMethods.activity.canEdit(data.id),
	},
};
