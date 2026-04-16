import { repositoryMethods } from "@db/generated/repositories";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import type { TableDataConfig } from "../data-config";

export const ARMOR_DATA_CONFIG: TableDataConfig<"armor"> = {
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
		],
		hiddenColumnDef: [],
		defaultSort: { id: "itemId", desc: false },
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.armor.insert,
		onUpdate: repositoryMethods.armor.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
	},
};
