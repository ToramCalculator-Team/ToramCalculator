import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { PlayerWeaponSchema, type player_weapon } from "@db/generated/zod";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const PLAYER_WEAPON_DATA_CONFIG: TableDataConfig<player_weapon> = {
	dictionary: dictionary.db.player_weapon,
	dataSchema: PlayerWeaponSchema,
	primaryKey: "id",
	defaultData: defaultData.player_weapon,
	dataFetcher: {
		get: repositoryMethods.player_weapon.select,
		getAll: repositoryMethods.player_weapon.selectAll,
		insert: repositoryMethods.player_weapon.insert,
		update: repositoryMethods.player_weapon.update,
		delete: repositoryMethods.player_weapon.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基础属性: ["type", "name", "baseAbi", "stability", "elementType"],
		附加属性: ["extraAbi", "refinement", "modifiers"],
		所属玩家: ["belongToPlayerId"],
	},
	table: {
		measure: {
			estimateSize: 120,
		},
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 160 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "stability", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "elementType", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "extraAbi", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "refinement", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "modifiers", cell: (info) => info.getValue(), size: 360 },
			{ accessorKey: "belongToPlayerId", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["id", "belongToPlayerId"],
		defaultSort: {
			id: "type",
			desc: false,
		},
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		onInsert: repositoryMethods.player_weapon.insert,
		onUpdate: repositoryMethods.player_weapon.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.player_weapon.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "player_weapon", data }),
		editAbleCallback: (data) => repositoryMethods.player_weapon.canEdit(data.id),
	},
};
