import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { NpcSchema, type npc } from "@db/generated/zod";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

export const NPC_DATA_CONFIG: TableDataConfig<npc> = (dictionary) => ({
	dictionary: dictionary().db.npc,
	dataSchema: NpcSchema,
	primaryKey: "id",
	defaultData: defaultData.npc,
	dataFetcher: {
		get: repositoryMethods.npc.select,
		getAll: repositoryMethods.npc.selectAll,
		insert: repositoryMethods.npc.insert,
		update: repositoryMethods.npc.update,
		delete: repositoryMethods.npc.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		所属区域: ["zoneId"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
		],
		hiddenColumnDef: [],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.npc.insert,
		onUpdate: repositoryMethods.npc.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.npc.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "npc", data }),
		editAbleCallback: (data) => repositoryMethods.npc.canEdit(data.id),
	},
});
