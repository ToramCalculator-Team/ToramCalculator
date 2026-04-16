import { repositoryMethods } from "@db/generated/repositories";
import type { TableDataConfig } from "../data-config";

export const ACTIVITY_DATA_CONFIG: TableDataConfig<"activity"> = {
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{
				accessorKey: "id",
				cell: (info) => info.getValue(),
				size: 200,
			},
			{
				accessorKey: "name",
				cell: (info) => info.getValue(),
				size: 220,
			},
		],
		hiddenColumnDef: ["id"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.activity.insert,
		onUpdate: repositoryMethods.activity.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
	},
};
