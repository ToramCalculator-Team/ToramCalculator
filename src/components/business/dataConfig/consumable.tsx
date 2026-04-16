import { repositoryMethods } from "@db/generated/repositories";
import type { TableDataConfig } from "../data-config";

export const CONSUMABLE_DATA_CONFIG: TableDataConfig<"consumable"> = {
	fieldGroupMap: {
		所属道具: ["itemId"],
		基本信息: ["name", "type"],
		效果信息: ["effects", "effectDuration"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
			{
				accessorKey: "effectDuration",
				cell: (info) => info.getValue(),
				size: 100,
			},
			{ accessorKey: "effects", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: [],
		defaultSort: { id: "itemId", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.consumable.insert,
		onUpdate: repositoryMethods.consumable.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
	},
};
