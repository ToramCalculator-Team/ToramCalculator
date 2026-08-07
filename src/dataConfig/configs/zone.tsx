import type { zone } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const ZONE_DATA_CONFIG: TableDataConfigurator<"zone", zone> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["name", "rewardNodes"],
			所属活动: ["activityId"],
			所属地点: ["addressId"],
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
					id: "rewardNodes",
					accessorFn: (row) => row.rewardNodes,
					cell: (info) => info.getValue<number | null>(),
					size: 120,
				},
				{
					id: "activityId",
					accessorFn: (row) => row.activityId,
					cell: (info) => info.getValue<string | null>(),
					size: 160,
				},
				{
					id: "addressId",
					accessorFn: (row) => row.addressId,
					cell: (info) => info.getValue<string>(),
					size: 160,
				},
			],
			hiddenColumnDef: [
				"id",
				"activityId",
				"addressId",
				"createdAt",
				"updatedAt",
				"createdByAccountId",
				"updatedByAccountId",
			],
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
	}) satisfies TableDataConfig<"zone", zone>;
