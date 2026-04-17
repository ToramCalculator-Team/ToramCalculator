import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { CharacterSchema, type character } from "@db/generated/zod";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const CHARACTER_DATA_CONFIG: TableDataConfig<character> = {
	dictionary: dictionary.db.character,
	dataSchema: CharacterSchema,
	primaryKey: "id",
	defaultData: defaultData.character,
	dataFetcher: {
		get: repositoryMethods.character.select,
		getAll: repositoryMethods.character.selectAll,
		insert: repositoryMethods.character.insert,
		update: repositoryMethods.character.update,
		delete: repositoryMethods.character.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "lv", "str", "int", "vit", "agi", "dex", "personalityType", "personalityValue"],
		装备信息: ["weaponId", "subWeaponId", "armorId", "optionId", "specialId"],
		其他信息: ["modifiers", "cooking"],
		统计信息: ["statisticId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "lv", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "str", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "int", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "vit", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "agi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "dex", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "personalityType", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "personalityValue", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "weaponId", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "subWeaponId", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "armorId", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "optionId", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "specialId", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "modifiers", cell: (info) => info.getValue(), size: 360 },
			{ accessorKey: "cooking", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "statisticId", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["id", "statisticId"],
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
		defaultSort: {
			id: "name",
			desc: false,
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.character.insert,
		onUpdate: repositoryMethods.character.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.character.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "character", data }),
		editAbleCallback: (data) => repositoryMethods.character.canEdit(data.id),
	},
};
