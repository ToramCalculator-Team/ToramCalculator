import type { crystal } from "@db/generated/zod";
import { Icons } from "~/components/ui/icons";
import { ModifiersRenderer } from "~/dataConfig/utils/ModifiersRenderer";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const CRYSTAL_DATA_CONFIG: TableDataConfigurator<"crystal", crystal> = (_dictionary) =>
	({
		fieldGroupMap: {
			基本信息: ["name", "type", "modifiers", "itemId"],
		},
		table: {
			measure: {
				estimateSize: 160,
			},
			columnsDef: [
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 260 },
				{ id: "itemId", accessorFn: (row) => row.itemId, cell: (info) => info.getValue(), size: 200 },
				{
					id: "modifiers",
					accessorFn: (row) => row.modifiers,
					cell: (info) => info.getValue(),
					size: 480,
				},
				{ id: "type", accessorFn: (row) => row.type, cell: (info) => info.getValue(), size: 180 },
			],
			hiddenColumnDef: ["itemId"],
			defaultSort: { field: "name", desc: false },
			tdGenerator: {
				modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
				name: ({ cell }) => (
					<div class="text-accent-color flex items-center gap-2">
						<div class="bg-area-color flex h-12 w-12 flex-none items-center justify-center rounded p-1">
							<Icons.Spirits iconName={cell.row.original.type} size={36} />
						</div>
						<span>{cell.getValue<string>()}</span>
					</div>
				),
			},
		},
		form: {
			hiddenFields: [],
			references: [
				{
					relation: "belongToItem",
					tableName: "item",
				},
			],
			referencedBy: [],
		},
		card: {
			hiddenFields: [],
			references: [
				{
					relation: "belongToItem",
					tableName: "item",
				},
			],
			referencedBy: [],
			renderers: {
				fields: {
					name: ({ data, dictionary }) => (
						<div class="Field flex gap-2">
							<span class="text-main-text-color text-nowrap">{dictionary?.key ?? "name"}</span>:
							<span class="flex items-center gap-2 font-bold">
								<Icons.Spirits iconName={data().type} size={24} /> {data().name}
							</span>
						</div>
					),
				},
			},
		},
	}) satisfies TableDataConfig<"crystal", crystal>;
