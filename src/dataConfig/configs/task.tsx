import type { task } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const TASK_DATA_CONFIG: TableDataConfigurator<"task", task> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["name", "lv", "type", "description"],
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
				{
					id: "lv",
					accessorFn: (row) => row.lv,
					cell: (info) => info.getValue<number | null>(),
					size: 120,
				},
				{
					id: "type",
					accessorFn: (row) => row.type,
					cell: (info) => info.getValue<string | null>(),
					size: 160,
				},
				{
					id: "description",
					accessorFn: (row) => row.description,
					cell: (info) => info.getValue<string | null>(),
					size: 160,
				},
			],
			hiddenColumnDef: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId", "belongToNpcId"],
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
	}) satisfies TableDataConfig<"task", task>;
