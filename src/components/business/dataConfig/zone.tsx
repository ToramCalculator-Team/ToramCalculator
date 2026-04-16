import { repositoryMethods } from "@db/generated/repositories";
import type { TableDataConfig } from "../data-config";

export const ZONE_DATA_CONFIG: TableDataConfig<"zone"> = {
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "rewardNodes"],
		所属活动: ["activityId"],
		所属地点: ["addressId"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
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
		hiddenColumnDef: ["id", "activityId", "addressId", "createdByAccountId", "updatedByAccountId", "statisticId"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.zone.insert,
		onUpdate: repositoryMethods.zone.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
	},
};
