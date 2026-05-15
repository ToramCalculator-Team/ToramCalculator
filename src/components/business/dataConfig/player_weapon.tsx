import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { PlayerWeaponSchema, type player_weapon } from "@db/generated/zod";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import { Icons } from "~/components/icons";
import type { TableDataConfig } from "../data-config";

export const PLAYER_WEAPON_DATA_CONFIG: TableDataConfig<player_weapon> = (dictionary) => ({
	dictionary: dictionary().db.player_weapon,
	dataSchema: PlayerWeaponSchema,
	primaryKey: "id",
	defaultData: defaultData.player_weapon,
	dataFetcher: {
		get: repositoryMethods.player_weapon.select,
		getAll: repositoryMethods.player_weapon.selectAll,
		liveQuery: (db) => db.selectFrom("player_weapon").selectAll("player_weapon"),
		insert: repositoryMethods.player_weapon.insert,
		update: repositoryMethods.player_weapon.update,
		delete: repositoryMethods.player_weapon.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基础属性: ["type", "name", "baseAbi", "stability", "elementType"],
		附加属性: ["extraAbi", "refinement", "modifiers"],
		所属玩家: ["belongToPlayerId"],
	},
	table: {
		measure: {
			estimateSize: 120,
		},
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "stability", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "elementType", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "extraAbi", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "refinement", cell: (info) => info.getValue(), size: 120 },
			{ accessorKey: "modifiers", cell: (info) => info.getValue(), size: 360 },
			{ accessorKey: "belongToPlayerId", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["id", "type", "belongToPlayerId"],
		defaultSort: {
			field: "name",
			desc: false,
		},
		tdGenerator: {
			name: ({ cell, dic }) => (
				<div class="text-accent-color flex items-center gap-2">
					<div class="flex-none w-12 h-12 p-1 flex items-center justify-center rounded bg-area-color">
						<Icons.Spirits iconName={cell.row.original.type} size={36} />
					</div>
					<span>{cell.getValue<string>()}</span>
				</div>
			),
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
		},
	},
	form: {
		// 创建资产时，通常player从上下文中获取，不另外编辑
		hiddenFields: ["id", "belongToPlayerId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.player_weapon.insert,
		onUpdate: repositoryMethods.player_weapon.update,
	},
	card: {
		relationOverrides: {
			only: ["weapon"],
		},
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.player_weapon.delete,
		editAbleCallback: (data) => repositoryMethods.player_weapon.canEdit(data.id),
	},
});
