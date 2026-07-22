import { defaultData } from "@db/defaultData";
import { repositoryMethods, repositoryQueries } from "@db/generated/repositories";
import { WorldSchema, type world } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const WORLD_DATA_CONFIG: TableDataConfig<world> = (dictionary) => ({
	dictionary: dictionary().db.world,
	dataSchema: WorldSchema,
	primaryKey: "id",
	defaultData: defaultData.world,
	queries: repositoryQueries.world,
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 }],
		hiddenColumnDef: ["createdAt", "updatedAt"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				const world = await repositoryMethods.world.insert(
					{
						...data,
						id: createId(),
						createdByAccountId: account.id,
						updatedByAccountId: account.id,
					},
					trx,
				);
				return world;
			});
		},
		onUpdate: repositoryMethods.world.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.world.delete,
		editAbleCallback: (data) => repositoryMethods.world.canEdit(data.id),
	},
});
