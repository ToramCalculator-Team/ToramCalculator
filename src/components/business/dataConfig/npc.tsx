import type { npc } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const NPC_DATA_CONFIG: TableDataConfigurator<"npc", npc> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["name"],
			所属区域: ["zoneId"],
			创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		},
		table: {
			columnsDef: [
				{ id: "id", accessorFn: (row) => row.id, cell: (info) => info.getValue(), size: 200 },
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 200 },
				{ id: "zoneId", accessorFn: (row) => row.zoneId, cell: (info) => info.getValue(), size: 200 },
			],
			hiddenColumnDef: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
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
	}) satisfies TableDataConfig<"npc", npc>;
