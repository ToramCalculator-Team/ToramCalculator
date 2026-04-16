import { repositoryMethods } from "@db/generated/repositories";
import type { ElementType } from "@db/schema/enums";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { Icons } from "~/components/icons";
import type { TableDataConfig } from "../data-config";

export const WEAPON_DATA_CONFIG: TableDataConfig<"weapon"> = {
	fieldGroupMap: {
		所属道具: ["itemId"],
		基本信息: ["name", "baseAbi", "stability", "elementType"],
		其他属性: ["modifiers"],
		颜色信息: ["colorA", "colorB", "colorC"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			{
				accessorKey: "stability",
				cell: (info) => info.getValue(),
				size: 100,
			},
			{
				accessorKey: "elementType",
				cell: (info) => info.getValue<ElementType>(),
				size: 150,
			},
			{ accessorKey: "modifiers", cell: (info) => info.getValue(), size: 360 },
			{ accessorKey: "colorA", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorB", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorC", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: {
			id: "name",
			desc: false,
		},
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
			elementType: (props) =>
				({
					Water: <Icons.Game.ElementWater class="h-12 w-12" />,
					Fire: <Icons.Game.ElementFire class="h-12 w-12" />,
					Earth: <Icons.Game.ElementEarth class="h-12 w-12" />,
					Wind: <Icons.Game.ElementWind class="h-12 w-12" />,
					Light: <Icons.Game.ElementLight class="h-12 w-12" />,
					Dark: <Icons.Game.ElementDark class="h-12 w-12" />,
					Normal: <Icons.Game.ElementNoElement class="h-12 w-12" />,
				})[props.cell.getValue<ElementType>()],
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: repositoryMethods.weapon.insert,
		onUpdate: repositoryMethods.weapon.update,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
	},
};
