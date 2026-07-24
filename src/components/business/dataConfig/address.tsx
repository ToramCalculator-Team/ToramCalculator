import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { AddressSchema, type address } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const ADDRESS_DATA_CONFIG: TableDataConfig<address> = (dictionary) => ({
	tableName: "address",
	dictionary: dictionary().db.address,
	dataSchema: AddressSchema,
	primaryKey: "id",
	defaultData: defaultData.address,
	queries: repositoryReaders.address,
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "type"],
		坐标信息: ["posX", "posY"],
		所属世界: ["worldId"],
		创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 160 },
			{ accessorKey: "posX", cell: (info) => info.getValue(), size: 160 },
			{ accessorKey: "posY", cell: (info) => info.getValue(), size: 160 },
		],
		hiddenColumnDef: ["id", "createdAt", "updatedAt"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				const address = await repositoryWriters.address.create(
					{
						...data,
						id: createId(),
						createdByAccountId: account.id,
						updatedByAccountId: account.id,
					},
					trx,
				);
				return address;
			});
		},
		onUpdate: repositoryWriters.address.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: repositoryWriters.address.delete,
		editAbleCallback: (data) => repositoryWriters.address.canEdit(data.id),
	},
});
