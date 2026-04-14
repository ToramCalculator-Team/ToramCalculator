import { repositoryMethods } from "@db/generated/repositories";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import type { TableDataConfig } from "../data-config";

export const PLAYER_OPTION_DATA_CONFIG: TableDataConfig<"player_option"> = {
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
	},
};
