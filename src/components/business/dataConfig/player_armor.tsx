import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { PlayerArmorSchema, type player_armor } from "@db/generated/zod";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const PLAYER_ARMOR_DATA_CONFIG: TableDataConfig<player_armor> = {
	dictionary: dictionary.db.player_armor,
	dataSchema: PlayerArmorSchema,
	primaryKey: "id",
	defaultData: defaultData.player_armor,
	dataFetcher: {
		get: repositoryMethods.player_armor.select,
		getAll: repositoryMethods.player_armor.selectAll,
		insert: repositoryMethods.player_armor.insert,
		update: repositoryMethods.player_armor.update,
		delete: repositoryMethods.player_armor.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基础属性: ["name", "baseAbi", "ability"],
		附加属性: ["extraAbi", "templateId", "refinement", "modifiers"],
		所属玩家: ["belongToPlayerId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 180 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "ability", cell: (info) => info.getValue(), size: 100 },
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
		onInsert: repositoryMethods.player_armor.insert,
		onUpdate: repositoryMethods.player_armor.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.player_armor.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "player_armor", data }),
		editAbleCallback: (data) => repositoryMethods.player_armor.canEdit(data.id),
	},
};
