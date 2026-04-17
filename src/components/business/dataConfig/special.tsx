import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { SpecialSchema, type special } from "@db/generated/zod";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const SPECIAL_DATA_CONFIG: TableDataConfig<special> = {
	dictionary: dictionary.db.special,
	dataSchema: SpecialSchema,
	primaryKey: "itemId",
	defaultData: defaultData.special,
	dataFetcher: {
		get: repositoryMethods.special.select,
		getAll: repositoryMethods.special.selectAll,
		insert: repositoryMethods.special.insert,
		update: repositoryMethods.special.update,
		delete: repositoryMethods.special.delete,
	},
	fieldGroupMap: {
		所属道具: ["itemId"],
		基本信息: ["name", "baseAbi"],
		其他属性: ["modifiers"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			{
				accessorKey: "modifiers",
				cell: (info) => info.getValue(),
				size: 150,
			},
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.special.insert,
		onUpdate: repositoryMethods.special.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.special.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "special", data }),
		editAbleCallback: (data) => repositoryMethods.special.canEdit(data.itemId),
	},
};
