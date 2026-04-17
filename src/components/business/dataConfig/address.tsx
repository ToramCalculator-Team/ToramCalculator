import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { AddressSchema, type address } from "@db/generated/zod";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const ADDRESS_DATA_CONFIG: TableDataConfig<address> = {
	dictionary: dictionary.db.address,
	dataSchema: AddressSchema,
	primaryKey: "id",
	defaultData: defaultData.address,
	dataFetcher: {
		get: repositoryMethods.address.select,
		getAll: repositoryMethods.address.selectAll,
		insert: repositoryMethods.address.insert,
		update: repositoryMethods.address.update,
		delete: repositoryMethods.address.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "type"],
		坐标信息: ["posX", "posY"],
		所属世界: ["worldId"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 160 },
			{ accessorKey: "posX", cell: (info) => info.getValue(), size: 160 },
			{ accessorKey: "posY", cell: (info) => info.getValue(), size: 160 },
		],
		hiddenColumnDef: ["id"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.address.insert,
		onUpdate: repositoryMethods.address.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.address.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "address", data }),
		editAbleCallback: (data) => repositoryMethods.address.canEdit(data.id),
	},
};
