import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { OptionSchema, type option } from "@db/generated/zod";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

export const OPTION_DATA_CONFIG: TableDataConfig<option> = (dictionary) => ({
	dictionary: dictionary().db.option,
	dataSchema: OptionSchema,
	primaryKey: "itemId",
	defaultData: defaultData.option,
	dataFetcher: {
		get: repositoryMethods.option.select,
		getAll: repositoryMethods.option.selectAll,
		insert: repositoryMethods.option.insert,
		update: repositoryMethods.option.update,
		delete: repositoryMethods.option.delete,
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
			{
				accessorKey: "modifiers",
				cell: (info) => info.getValue(),
				size: 150,
			},
			{ accessorKey: "colorA", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorB", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorC", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: {
			id: "name",
			desc: false,
		},
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.option.insert,
		onUpdate: repositoryMethods.option.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.option.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "option", data }),
		editAbleCallback: (data) => repositoryMethods.option.canEdit(data.itemId),
	},
});
