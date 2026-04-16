import { repositoryMethods } from "@db/generated/repositories";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import type { TableDataConfig } from "../data-config";

export const PLAYER_WEAPON_DATA_CONFIG: TableDataConfig<"player_weapon"> = {
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
	},
};
