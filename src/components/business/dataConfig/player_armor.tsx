import type { player_armor } from "@db/generated/zod";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import { Icons } from "~/components/icons";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const PLAYER_ARMOR_DATA_CONFIG: TableDataConfigurator<"player_armor", player_armor> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基础属性: ["name", "baseAbi", "ability"],
			附加属性: ["extraAbi", "templateId", "refinement", "modifiers"],
			所属玩家: ["belongToPlayerId"],
		},
		table: {
			measure: { estimateSize: 80 },
			columnsDef: [
				{ id: "id", accessorFn: (row) => row.id, cell: (info) => info.getValue(), size: 200 },
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 180 },
				{ id: "baseAbi", accessorFn: (row) => row.baseAbi, cell: (info) => info.getValue(), size: 100 },
				{ id: "ability", accessorFn: (row) => row.ability, cell: (info) => info.getValue(), size: 100 },
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
			hiddenColumnDef: ["id", "ability", "belongToPlayerId", "templateId"],
			defaultSort: { field: "name", desc: false },
			tdGenerator: {
				name: ({ cell }) => (
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
			hiddenFields: ["id", "belongToPlayerId"],
			references: [],
			referencedBy: [],
		},
		card: {
			hiddenFields: ["id"],
			references: [],
			referencedBy: [],
		},
	}) satisfies TableDataConfig<"player_armor", player_armor>;
