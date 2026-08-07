import type { weapon } from "@db/generated/zod";
import { type ElementType, WEAPON_TYPE, type WeaponType } from "@db/schema/enums";
import { Input } from "~/components/ui/controls/input";
import { Select } from "~/components/ui/controls/select";
import { DefaultFieldClass } from "~/components/ui/form/fields";
import { Icons } from "~/components/ui/icons";
import { ModifiersRenderer } from "~/dataConfig/utils/ModifiersRenderer";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const WEAPON_DATA_CONFIG: TableDataConfigurator<"weapon", weapon> = (dictionary) =>
	({
		fieldGroupMap: {
			基本信息: ["type", "name", "baseAbi", "stability", "elementType", "itemId"],
			其他属性: ["modifiers"],
			颜色信息: ["colorA", "colorB", "colorC"],
		},
		table: {
			columnsDef: [
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 200 },
				{ id: "itemId", accessorFn: (row) => row.itemId, cell: (info) => info.getValue(), size: 200 },
				{ id: "baseAbi", accessorFn: (row) => row.baseAbi, cell: (info) => info.getValue(), size: 100 },
				{
					id: "stability",
					accessorFn: (row) => row.stability,
					cell: (info) => info.getValue(),
					size: 100,
				},
				{
					id: "elementType",
					accessorFn: (row) => row.elementType,
					cell: (info) => info.getValue<ElementType>(),
					size: 150,
				},
				{ id: "modifiers", accessorFn: (row) => row.modifiers, cell: (info) => info.getValue(), size: 360 },
				{ id: "type", accessorFn: (row) => row.type, cell: (info) => info.getValue(), size: 180 },
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
				name: ({ cell }) => (
					<div class="text-accent-color flex items-center gap-2">
						<div class="bg-area-color flex h-12 w-12 flex-none items-center justify-center rounded p-1">
							<Icons.Spirits iconName={cell.row.original.type} size={36} />
						</div>
						<span>{cell.getValue<string>()}</span>
					</div>
				),
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
			renderers: {
				fields: {
					type: ({ value, setValue, validationMessage }) => {
						const typeDictionary = dictionary.db.weapon.fields.type;
						return (
							<Input
								title={typeDictionary.key}
								description={typeDictionary.formFieldDescription}
								validationMessage={validationMessage}
								class={DefaultFieldClass}
							>
								<Select
									options={WEAPON_TYPE.map((type) => ({
										label: typeDictionary.enumMap[type],
										value: type,
									}))}
									value={value() as WeaponType}
									setValue={(v) => setValue(v as WeaponType)}
								/>
							</Input>
						);
					},
				},
			},
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
	}) satisfies TableDataConfig<"weapon", weapon>;
