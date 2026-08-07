import type { activity } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const ACTIVITY_DATA_CONFIG: TableDataConfigurator<"activity", activity> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["name"],
			创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		},
		table: {
			columnsDef: [
				{
					id: "id",
					accessorFn: (row) => row.id,
					cell: (info) => info.getValue(),
					size: 200,
				},
				{
					id: "name",
					accessorFn: (row) => row.name,
					cell: (info) => info.getValue(),
					size: 220,
				},
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
			references: [],
			referencedBy: [{
				relation: "zone.belongToActivity",
				tableName: "zone"
			}],
		},
	}) satisfies TableDataConfig<"activity", activity>;
