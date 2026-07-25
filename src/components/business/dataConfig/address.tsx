import type { address } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const ADDRESS_DATA_CONFIG: TableDataConfigurator<"address", address> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["name", "type"],
			坐标信息: ["posX", "posY"],
			所属世界: ["worldId"],
			创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		},
		table: {
			columnsDef: [
				{ id: "id", accessorFn: (row) => row.id, cell: (info) => info.getValue(), size: 200 },
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 200 },
				{ id: "type", accessorFn: (row) => row.type, cell: (info) => info.getValue(), size: 160 },
				{ id: "posX", accessorFn: (row) => row.posX, cell: (info) => info.getValue(), size: 160 },
				{ id: "posY", accessorFn: (row) => row.posY, cell: (info) => info.getValue(), size: 160 },
			],
			hiddenColumnDef: ["id", "createdAt", "updatedAt"],
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
			references: [{
				relation: "belongToWorld",
				tableName: "world"
			}],
			referencedBy: [{
				relation: "zone.belongToAddress",
				tableName: "zone"
			}],
		},
	}) satisfies TableDataConfig<"address", address>;
