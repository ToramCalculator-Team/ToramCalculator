import type { option } from "@db/generated/zod";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const OPTION_DATA_CONFIG: TableDataConfigurator<"option", option> = (_dictionary) =>
	({
		fieldGroupMap: {
			基本信息: ["name", "baseAbi", "itemId"],
			其他属性: ["modifiers"],
			颜色信息: ["colorA", "colorB", "colorC"],
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
				{ id: "colorA", accessorFn: (row) => row.colorA, cell: (info) => info.getValue(), size: 150 },
				{ id: "colorB", accessorFn: (row) => row.colorB, cell: (info) => info.getValue(), size: 150 },
				{ id: "colorC", accessorFn: (row) => row.colorC, cell: (info) => info.getValue(), size: 150 },
			],
			hiddenColumnDef: ["itemId"],
			defaultSort: {
				field: "name",
				desc: false,
			},
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
	}) satisfies TableDataConfig<"option", option>;
