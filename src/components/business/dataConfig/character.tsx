import { defaultData } from "@db/defaultData";
import { repositoryMethods, repositoryQueries } from "@db/generated/repositories";
import { CharacterSchema, type character } from "@db/generated/zod";
import { createId } from "@paralleldrive/cuid2";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import type { TableDataConfig } from "../data-config";

export const CHARACTER_DATA_CONFIG: TableDataConfig<character> = (dictionary) => ({
	dictionary: dictionary().db.character,
	dataSchema: CharacterSchema,
	primaryKey: "id",
	defaultData: defaultData.character,
	queries: repositoryQueries.character,
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "lv", "str", "int", "vit", "agi", "dex", "personalityType", "personalityValue"],
		装备信息: ["weaponId", "subWeaponId", "armorId", "optionId", "specialId"],
		其他信息: ["modifiers", "cooking"],
		创建和更新信息: ["createdAt", "updatedAt"],
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
		],
		hiddenColumnDef: ["id", "createdAt", "updatedAt"],
		tdGenerator: {
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
		},
		defaultSort: {
			field: "name",
			desc: false,
		},
	},
	form: {
		hiddenFields: ["id", "createdAt", "updatedAt"],
		onInsert: (data) => repositoryMethods.character.insert({ ...data, id: createId() }),
		onUpdate: repositoryMethods.character.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.character.delete,
		editAbleCallback: (data) => repositoryMethods.character.canEdit(data.id),
	},
});
