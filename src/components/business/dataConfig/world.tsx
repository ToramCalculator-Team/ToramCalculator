import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { WorldSchema, type world } from "@db/generated/zod";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const WORLD_DATA_CONFIG: TableDataConfig<world> = {
	dictionary: dictionary.db.world,
	dataSchema: WorldSchema,
	primaryKey: "id",
	defaultData: defaultData.world,
	dataFetcher: {
		get: repositoryMethods.world.select,
		getAll: repositoryMethods.world.selectAll,
		insert: repositoryMethods.world.insert,
		update: repositoryMethods.world.update,
		delete: repositoryMethods.world.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 }],
		hiddenColumnDef: [],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.world.insert,
		onUpdate: repositoryMethods.world.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.world.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "world", data }),
		editAbleCallback: (data) => repositoryMethods.world.canEdit(data.id),
	},
};
