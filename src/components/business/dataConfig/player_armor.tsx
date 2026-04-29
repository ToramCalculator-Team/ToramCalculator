import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { PlayerArmorSchema, type player_armor } from "@db/generated/zod";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import { Icons } from "~/components/icons";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

export const PLAYER_ARMOR_DATA_CONFIG: TableDataConfig<player_armor> = (dictionary) => ({
	dictionary: dictionary().db.player_armor,
	dataSchema: PlayerArmorSchema,
	primaryKey: "id",
	defaultData: defaultData.player_armor,
	dataFetcher: {
		get: repositoryMethods.player_armor.select,
		getAll: repositoryMethods.player_armor.selectAll,
		liveQuery: (db) => db.selectFrom("player_armor").selectAll("player_armor"),
		insert: repositoryMethods.player_armor.insert,
		update: repositoryMethods.player_armor.update,
		delete: repositoryMethods.player_armor.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基础属性: ["name", "baseAbi", "ability"],
		附加属性: ["extraAbi", "templateId", "refinement", "modifiers"],
		所属玩家: ["belongToPlayerId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 180 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "ability", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "extraAbi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "templateId", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "refinement", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "modifiers", cell: (info) => info.getValue(), size: 360 },
			{ accessorKey: "belongToPlayerId", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["id", "ability", "belongToPlayerId", "templateId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {
			name: ({ cell, dic }) => (
				<div class="text-accent-color flex items-center gap-2">
					<div class="flex-none w-12 h-12 p-1 flex items-center justify-center rounded bg-area-color">
						<Icons.Spirits iconName={cell.row.original.ability} size={36} />
					</div>
					<span>{cell.getValue<string>()}</span>
				</div>
			),
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
		},
	},
	form: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		onInsert: repositoryMethods.player_armor.insert,
		onUpdate: repositoryMethods.player_armor.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.player_armor.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "player_armor", data }),
		editAbleCallback: (data) => repositoryMethods.player_armor.canEdit(data.id),
	},
});
