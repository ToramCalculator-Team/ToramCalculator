import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { NpcSchema, type npc } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const NPC_DATA_CONFIG: TableDataConfig<npc> = (dictionary) => ({
	tableName: "npc",
	dictionary: dictionary().db.npc,
	dataSchema: NpcSchema,
	primaryKey: "id",
	defaultData: defaultData.npc,
	queries: repositoryReaders.npc,
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		所属区域: ["zoneId"],
		创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "zoneId", cell: (info) => info.getValue(), size: 200 },
		],
		hiddenColumnDef: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				return repositoryWriters.npc.create(
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
				return repositoryWriters.npc.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: repositoryWriters.npc.delete,
		editAbleCallback: (data) => repositoryWriters.npc.canEdit(data.id),
	},
});
