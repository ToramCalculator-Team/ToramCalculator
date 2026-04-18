import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { PlayerOptionSchema, type player_option } from "@db/generated/zod";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

export const PLAYER_OPTION_DATA_CONFIG: TableDataConfig<player_option> = (dictionary) => ({
	dictionary: dictionary().db.player_option,
	dataSchema: PlayerOptionSchema,
	primaryKey: "id",
	defaultData: defaultData.player_option,
	dataFetcher: {
		get: repositoryMethods.player_option.select,
		getAll: repositoryMethods.player_option.selectAll,
		liveQuery: (db) => db.selectFrom("player_option").selectAll("player_option"),
		insert: repositoryMethods.player_option.insert,
		update: repositoryMethods.player_option.update,
		delete: repositoryMethods.player_option.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基础属性: ["name", "baseAbi"],
		附加属性: ["extraAbi", "templateId", "refinement", "modifiers"],
		所属玩家: ["belongToPlayerId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 180 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "extraAbi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "templateId", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "refinement", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "modifiers", cell: (info) => info.getValue(), size: 360 },
			{ accessorKey: "belongToPlayerId", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["id", "belongToPlayerId", "templateId"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		onInsert: repositoryMethods.player_option.insert,
		onUpdate: repositoryMethods.player_option.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.player_option.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "player_option", data }),
		editAbleCallback: (data) => repositoryMethods.player_option.canEdit(data.id),
	},
});
