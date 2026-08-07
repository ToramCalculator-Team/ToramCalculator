import type { item } from "@db/generated/zod";
import { Icons } from "~/components/ui/icons";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const ITEM_DATA_CONFIG: TableDataConfigurator<"item", item> = (_dictionary) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["name", "itemType", "itemSourceType"],
			其他属性: ["dataSources", "details"],
			创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		},
		table: {
			columnsDef: [
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 200 },
				{ id: "itemType", accessorFn: (row) => row.itemType, cell: (info) => info.getValue(), size: 150 },
				{
					id: "itemSourceType",
					accessorFn: (row) => row.itemSourceType,
					cell: (info) => info.getValue(),
					size: 150,
				},
				{
					id: "dataSources",
					accessorFn: (row) => row.dataSources,
					cell: (info) => info.getValue(),
					size: 150,
				},
				{ id: "details", accessorFn: (row) => row.details, cell: (info) => info.getValue(), size: 150 },
			],
			hiddenColumnDef: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
			defaultSort: { field: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
			references: [],
			referencedBy: [],
		},
		card: {
			hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
			references: [],
			referencedBy: [
				{
					icon: <Icons.Spirits iconName="weapon" />,
					relation: "weapon.belongToItem",
					tableName: "weapon",
				},
				{
					icon: <Icons.Spirits iconName="armor" />,
					relation: "armor.belongToItem",
					tableName: "armor",
				},
				{
					icon: <Icons.Spirits iconName="option" />,
					relation: "option.belongToItem",
					tableName: "option",
				},
				{
					icon: <Icons.Spirits iconName="special" />,
					relation: "special.belongToItem",
					tableName: "special",
				},
				{
					icon: <Icons.Spirits iconName="crystal" />,
					relation: "crystal.belongToItem",
					tableName: "crystal",
				},
				{
					icon: <Icons.Spirits iconName="consumable" />,
					relation: "consumable.belongToItem",
					tableName: "consumable",
				},
				{
					icon: <Icons.Spirits iconName="material" />,
					relation: "material.belongToItem",
					tableName: "material",
				},
				{
					icon: <Icons.Spirits iconName="recipe" />,
					relation: "recipe.belongToItem",
					tableName: "recipe",
				},
				{
					icon: <Icons.Spirits iconName="task_reward" />,
					relation: "task_reward.item",
					tableName: "task_reward",
				},
				{
					icon: <Icons.Spirits iconName="task_collect_require" />,
					relation: "task_collect_require.item",
					tableName: "task_collect_require",
				},
			],
		},
	}) satisfies TableDataConfig<"item", item>;
