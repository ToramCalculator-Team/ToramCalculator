import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { TaskSchema, type task } from "@db/generated/zod";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const TASK_DATA_CONFIG: TableDataConfig<task> = {
	dictionary: dictionary.db.task,
	dataSchema: TaskSchema,
	primaryKey: "id",
	defaultData: defaultData.task,
	dataFetcher: {
		get: repositoryMethods.task.select,
		getAll: repositoryMethods.task.selectAll,
		insert: repositoryMethods.task.insert,
		update: repositoryMethods.task.update,
		delete: repositoryMethods.task.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "lv", "type", "description"],
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
		hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId", "belongToNpcId"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.task.insert,
		onUpdate: repositoryMethods.task.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.task.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "task", data }),
		editAbleCallback: (data) => repositoryMethods.task.canEdit(data.id),
	},
};
