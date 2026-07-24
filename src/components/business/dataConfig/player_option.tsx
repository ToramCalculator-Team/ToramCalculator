import type { player_option } from "@db/generated/zod";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const PLAYER_OPTION_DATA_CONFIG: TableDataConfigurator<"player_option", player_option> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基础属性: ["name", "baseAbi"],
			附加属性: ["extraAbi", "templateId", "refinement", "modifiers"],
			所属玩家: ["belongToPlayerId"],
		},
		table: {
			measure: { estimateSize: 80 },
			columnsDef: [
				{ id: "id", accessorFn: (row) => row.id, cell: (info) => info.getValue(), size: 200 },
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 180 },
				{ id: "baseAbi", accessorFn: (row) => row.baseAbi, cell: (info) => info.getValue(), size: 100 },
				{ id: "extraAbi", accessorFn: (row) => row.extraAbi, cell: (info) => info.getValue(), size: 100 },
				{ id: "templateId", accessorFn: (row) => row.templateId, cell: (info) => info.getValue(), size: 100 },
				{ id: "refinement", accessorFn: (row) => row.refinement, cell: (info) => info.getValue(), size: 100 },
				{ id: "modifiers", accessorFn: (row) => row.modifiers, cell: (info) => info.getValue(), size: 360 },
				{
					id: "belongToPlayerId",
					accessorFn: (row) => row.belongToPlayerId,
					cell: (info) => info.getValue(),
					size: 100,
				},
			],
			hiddenColumnDef: ["id", "belongToPlayerId", "templateId"],
			defaultSort: { field: "name", desc: false },
			tdGenerator: {
				modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
			},
		},
		form: {
			hiddenFields: ["id", "belongToPlayerId"],
			references: [],
			referencedBy: [],
		},
		card: {
			hiddenFields: ["id"],
			references: [],
			referencedBy: [],
		},
	}) satisfies TableDataConfig<"player_option", player_option>;
