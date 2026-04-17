import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { MaterialSchema, type material } from "@db/generated/zod";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const MATERIAL_DATA_CONFIG: TableDataConfig<material> = {
	dictionary: dictionary.db.material,
	dataSchema: MaterialSchema,
	primaryKey: "itemId",
	defaultData: defaultData.material,
	dataFetcher: {
		get: repositoryMethods.material.select,
		getAll: repositoryMethods.material.selectAll,
		insert: repositoryMethods.material.insert,
		update: repositoryMethods.material.update,
		delete: repositoryMethods.material.delete,
	},
	fieldGroupMap: {
		所属道具: ["itemId"],
		基本信息: ["name", "type", "price", "ptValue"],
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
		onInsert: repositoryMethods.material.insert,
		onUpdate: repositoryMethods.material.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.material.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "material", data }),
		editAbleCallback: (data) => repositoryMethods.material.canEdit(data.itemId),
	},
};
