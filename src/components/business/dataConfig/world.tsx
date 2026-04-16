import { repositoryMethods } from "@db/generated/repositories";
import type { TableDataConfig } from "../data-config";

export const WORLD_DATA_CONFIG: TableDataConfig<"world"> = {
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 }],
		hiddenColumnDef: [],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.world.insert,
		onUpdate: repositoryMethods.world.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
	},
};
