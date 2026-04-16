import { repositoryMethods } from "@db/generated/repositories";
import type { TableDataConfig } from "../data-config";

export const MATERIAL_DATA_CONFIG: TableDataConfig<"material"> = {
	fieldGroupMap: {
		所属道具: ["itemId"],
		基本信息: ["name", "type", "price", "ptValue"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "price", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "ptValue", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.material.insert,
		onUpdate: repositoryMethods.material.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
	},
};
