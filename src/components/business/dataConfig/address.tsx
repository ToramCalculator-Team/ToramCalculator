import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { AddressSchema, type address } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const ADDRESS_DATA_CONFIG: TableDataConfig<address> = (dictionary) => ({
	dictionary: dictionary().db.address,
	dataSchema: AddressSchema,
	primaryKey: "id",
	defaultData: defaultData.address,
	dataFetcher: {
		get: repositoryMethods.address.select,
		getAll: repositoryMethods.address.selectAll,
		liveQuery: (db) => db.selectFrom("address").selectAll("address"),
		insert: repositoryMethods.address.insert,
		update: repositoryMethods.address.update,
		delete: repositoryMethods.address.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "type"],
		坐标信息: ["posX", "posY"],
		所属世界: ["worldId"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 160 },
			{ accessorKey: "posX", cell: (info) => info.getValue(), size: 160 },
			{ accessorKey: "posY", cell: (info) => info.getValue(), size: 160 },
		],
		hiddenColumnDef: ["id"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				const statistic = await insertStatistic({
					...defaultData.statistic,
					id: createId(),
				}, trx);
				const address = await repositoryMethods.address.insert({
					...data,
					id: createId(),
					statisticId: statistic.id,
					createdByAccountId: account.id,
					updatedByAccountId: account.id,
				}, trx);
				return address;
			});
		},
		onUpdate: repositoryMethods.address.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.address.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "address", data }),
		editAbleCallback: (data) => repositoryMethods.address.canEdit(data.id),
	},
});
