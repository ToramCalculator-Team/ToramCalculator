import type { character } from "@db/generated/zod";
import { ModifiersRenderer } from "~/dataConfig/utils/ModifiersRenderer";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const CHARACTER_DATA_CONFIG: TableDataConfigurator<"character", character> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["name", "lv", "str", "int", "vit", "agi", "dex", "personalityType", "personalityValue"],
			装备信息: ["weaponId", "subWeaponId", "armorId", "optionId", "specialId"],
			其他信息: ["modifiers", "cooking"],
			创建和更新信息: ["createdAt", "updatedAt"],
		},
		table: {
			columnsDef: [
				{ id: "id", accessorFn: (row) => row.id, cell: (info) => info.getValue(), size: 200 },
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 200 },
				{ id: "lv", accessorFn: (row) => row.lv, cell: (info) => info.getValue(), size: 100 },
				{ id: "str", accessorFn: (row) => row.str, cell: (info) => info.getValue(), size: 100 },
				{ id: "int", accessorFn: (row) => row.int, cell: (info) => info.getValue(), size: 100 },
				{ id: "vit", accessorFn: (row) => row.vit, cell: (info) => info.getValue(), size: 100 },
				{ id: "agi", accessorFn: (row) => row.agi, cell: (info) => info.getValue(), size: 100 },
				{ id: "dex", accessorFn: (row) => row.dex, cell: (info) => info.getValue(), size: 100 },
				{ id: "personalityType", accessorFn: (row) => row.personalityType, cell: (info) => info.getValue(), size: 100 },
				{
					id: "personalityValue",
					accessorFn: (row) => row.personalityValue,
					cell: (info) => info.getValue(),
					size: 100,
				},
				{ id: "weaponId", accessorFn: (row) => row.weaponId, cell: (info) => info.getValue(), size: 100 },
				{ id: "subWeaponId", accessorFn: (row) => row.subWeaponId, cell: (info) => info.getValue(), size: 100 },
				{ id: "armorId", accessorFn: (row) => row.armorId, cell: (info) => info.getValue(), size: 100 },
				{ id: "optionId", accessorFn: (row) => row.optionId, cell: (info) => info.getValue(), size: 100 },
				{ id: "specialId", accessorFn: (row) => row.specialId, cell: (info) => info.getValue(), size: 100 },
				{ id: "modifiers", accessorFn: (row) => row.modifiers, cell: (info) => info.getValue(), size: 360 },
				{ id: "cooking", accessorFn: (row) => row.cooking, cell: (info) => info.getValue(), size: 100 },
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
			references: [],
			referencedBy: [],
		},
		card: {
			hiddenFields: [],
			references: [],
			referencedBy: [],
		},
	}) satisfies TableDataConfig<"character", character>;
