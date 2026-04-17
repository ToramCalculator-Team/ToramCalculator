import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { ConsumableSchema, type consumable } from "@db/generated/zod";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const CONSUMABLE_DATA_CONFIG: TableDataConfig<consumable> = {
	dictionary: dictionary.db.consumable,
	dataSchema: ConsumableSchema,
	primaryKey: "itemId",
	defaultData: defaultData.consumable,
	dataFetcher: {
		get: repositoryMethods.consumable.select,
		getAll: repositoryMethods.consumable.selectAll,
		insert: repositoryMethods.consumable.insert,
		update: repositoryMethods.consumable.update,
		delete: repositoryMethods.consumable.delete,
	},
	fieldGroupMap: {
		所属道具: ["itemId"],
		基本信息: ["name", "type"],
		效果信息: ["effects", "effectDuration"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
			{
				accessorKey: "effectDuration",
				cell: (info) => info.getValue(),
				size: 100,
			},
			{ accessorKey: "effects", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: [],
		defaultSort: { id: "itemId", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.consumable.insert,
		onUpdate: repositoryMethods.consumable.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.consumable.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "consumable", data }),
		editAbleCallback: (data) => repositoryMethods.consumable.canEdit(data.itemId),
	},
};
