import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { PlayerSpecialSchema, type player_special } from "@db/generated/zod";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

export const PLAYER_SPECIAL_DATA_CONFIG: TableDataConfig<player_special> = (dictionary) => ({
	dictionary: dictionary().db.player_special,
	dataSchema: PlayerSpecialSchema,
	primaryKey: "id",
	defaultData: defaultData.player_special,
	dataFetcher: {
		get: repositoryMethods.player_special.select,
		getAll: repositoryMethods.player_special.selectAll,
		insert: repositoryMethods.player_special.insert,
		update: repositoryMethods.player_special.update,
		delete: repositoryMethods.player_special.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基础属性: ["name", "baseAbi"],
		附加属性: ["extraAbi", "templateId", "modifiers"],
		所属玩家: ["belongToPlayerId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 180 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "extraAbi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "templateId", cell: (info) => info.getValue(), size: 100 },
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
		onInsert: repositoryMethods.player_special.insert,
		onUpdate: repositoryMethods.player_special.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.player_special.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "player_special", data }),
		editAbleCallback: (data) => repositoryMethods.player_special.canEdit(data.id),
	},
});
