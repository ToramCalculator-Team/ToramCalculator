import type { world } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const WORLD_DATA_CONFIG: TableDataConfigurator<"world", world> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["name"],
			创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		},
		table: {
			columnsDef: [{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 200 }],
			hiddenColumnDef: ["createdAt", "updatedAt"],
			defaultSort: { field: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
			references: [],
			referencedBy: [],
		},
		card: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
			references: [],
			referencedBy: [],
		},
	}) satisfies TableDataConfig<"world", world>;
