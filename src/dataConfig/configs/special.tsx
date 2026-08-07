import type { special } from "@db/generated/zod";
import { ModifiersRenderer } from "~/dataConfig/utils/ModifiersRenderer";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const SPECIAL_DATA_CONFIG: TableDataConfigurator<"special", special> = (_dictionary) =>
	({
		fieldGroupMap: {
			基本信息: ["name", "baseAbi", "itemId"],
			其他属性: ["modifiers"],
		},
		table: {
			columnsDef: [
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 200 },
				{ id: "itemId", accessorFn: (row) => row.itemId, cell: (info) => info.getValue(), size: 200 },
				{ id: "baseAbi", accessorFn: (row) => row.baseAbi, cell: (info) => info.getValue(), size: 100 },
				{
					id: "modifiers",
					accessorFn: (row) => row.modifiers,
					cell: (info) => info.getValue(),
					size: 150,
				},
			],
			hiddenColumnDef: ["itemId"],
			defaultSort: { field: "name", desc: false },
			tdGenerator: {
				modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
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
		},
	}) satisfies TableDataConfig<"special", special>;
