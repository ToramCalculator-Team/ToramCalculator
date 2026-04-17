import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { CrystalSchema, type crystal } from "@db/generated/zod";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { Icons } from "~/components/icons";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language); 

export const CRYSTAL_DATA_CONFIG: TableDataConfig<crystal> = {
	dictionary: dictionary.db.crystal,
	dataSchema: CrystalSchema,
	primaryKey: "itemId",
	defaultData: defaultData.crystal,
	dataFetcher: {
		get: repositoryMethods.crystal.select,
		getAll: repositoryMethods.crystal.selectAll,
		insert: repositoryMethods.crystal.insert,
		update: repositoryMethods.crystal.update,
		delete: repositoryMethods.crystal.delete,
	},
	fieldGroupMap: {
		所属道具: ["itemId"],
		基本信息: ["name", "type", "modifiers"],
	},
	table: {
		measure: {
			estimateSize: 160,
		},
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{
				accessorKey: "modifiers",
				cell: (info) => info.getValue(),
				size: 480,
			},
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: [],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.crystal.insert,
		onUpdate: repositoryMethods.crystal.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {
			name: (data, key, dictionary) => {
				return (
					<div class="Field flex gap-2">
						<span class="text-main-text-color text-nowrap">{dictionary.fields[key].key}</span>:
						<span class="flex items-center gap-2 font-bold">
							<Icons.Spirits iconName={data.type} size={24} /> {String(data[key])}
						</span>
					</div>
				);
			},
		},
		deleteCallback: repositoryMethods.crystal.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "crystal", data }),
		editAbleCallback: (data) => repositoryMethods.crystal.canEdit(data.itemId),
	},
};
