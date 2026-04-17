import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { ArmorSchema, type armor } from "@db/generated/zod";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const ARMOR_DATA_CONFIG: TableDataConfig<armor> = {
	dictionary: dictionary.db.armor,
	dataSchema: ArmorSchema,
	primaryKey: "itemId",
	defaultData: defaultData.armor,
	dataFetcher: {
		get: repositoryMethods.armor.select,
		getAll: repositoryMethods.armor.selectAll,
		insert: repositoryMethods.armor.insert,
		update: repositoryMethods.armor.update,
		delete: repositoryMethods.armor.delete,
	},
	fieldGroupMap: {
		所属道具: ["itemId"],
		基本信息: ["name", "baseAbi"],
		其他属性: ["modifiers"],
		颜色信息: ["colorA", "colorB", "colorC"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: [],
		defaultSort: { id: "itemId", desc: false },
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.armor.insert,
		onUpdate: repositoryMethods.armor.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.armor.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "armor", data }),
		editAbleCallback: (data) => repositoryMethods.armor.canEdit(data.itemId),
	},
};
