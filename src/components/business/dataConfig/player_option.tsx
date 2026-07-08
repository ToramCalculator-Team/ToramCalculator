import { defaultData } from "@db/defaultData";
import { repositoryMethods, repositoryQueries } from "@db/generated/repositories";
import { PlayerOptionSchema, type player_option } from "@db/generated/zod";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import type { TableDataConfig } from "../data-config";

export const PLAYER_OPTION_DATA_CONFIG: TableDataConfig<player_option> = (dictionary) => ({
	dictionary: dictionary().db.player_option,
	dataSchema: PlayerOptionSchema,
	primaryKey: "id",
	defaultData: defaultData.player_option,
	queries: repositoryQueries.player_option,
	fieldGroupMap: {
		ID: ["id"],
		基础属性: ["name", "baseAbi"],
		附加属性: ["extraAbi", "templateId", "refinement", "modifiers"],
		所属玩家: ["belongToPlayerId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 180 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "extraAbi", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "templateId", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "refinement", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "modifiers", cell: (info) => info.getValue(), size: 360 },
			{ accessorKey: "belongToPlayerId", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["id", "belongToPlayerId", "templateId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
		},
	},
	form: {
		// 创建资产时，通常player从上下文中获取，不另外编辑
		hiddenFields: ["id", "belongToPlayerId"],
		onInsert: repositoryMethods.player_option.insert,
		onUpdate: repositoryMethods.player_option.update,
	},
	card: {
		relationOverrides: {
			only: ["option"],
		},
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.player_option.delete,
		editAbleCallback: (data) => repositoryMethods.player_option.canEdit(data.id),
	},
});
