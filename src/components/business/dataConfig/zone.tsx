import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { ZoneSchema, type zone } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const ZONE_DATA_CONFIG: TableDataConfig<zone> = (dictionary) => ({
	tableName: "zone",
	dictionary: dictionary().db.zone,
	dataSchema: ZoneSchema,
	primaryKey: "id",
	defaultData: defaultData.zone,
	queries: repositoryReaders.zone,
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
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				return repositoryWriters.zone.create(
					{
						...data,
						id: createId(),
						createdByAccountId: account.id,
						updatedByAccountId: account.id,
					},
					trx,
				);
			});
		},
		onUpdate: async (id, data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				return repositoryWriters.zone.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: repositoryWriters.zone.delete,
		editAbleCallback: (data) => repositoryWriters.zone.canEdit(data.id),
	},
});
