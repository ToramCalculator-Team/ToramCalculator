import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { deleteItemQuery, insertItemQuery, updateItemQuery } from "@db/generated/repositories/item";
import { deleteWeaponQuery, insertWeaponQuery, updateWeaponQuery } from "@db/generated/repositories/weapon";
import { ItemSchema, WeaponSchema, type weapon } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { type ElementType, WEAPON_TYPE, type WeaponType } from "@db/schema/enums";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons";
import type { QueryDB, TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const WeaponItemSchema = ItemSchema.extend(WeaponSchema.shape);
type WeaponItem = z.output<typeof WeaponItemSchema>;

const WeaponItemDefaultData: WeaponItem = {
	...defaultData.weapon,
	...defaultData.item,
};

/**
 * 设计思路：weapon 在业务实体上继承 item 字段，列表订阅和详情读取必须共用同一条联合查询，避免列选择分裂。
 * 函数职责：构造 weapon 与 item 合并后的业务实体查询。
 */
const selectWeaponItemQuery = (db: QueryDB) =>
	db
		.selectFrom("weapon")
		.innerJoin("item", (join) => join.onRef("weapon.itemId", "=", "item.id"))
		.selectAll("item")
		.select([
			"weapon.itemId",
			"weapon.type",
			"weapon.elementType",
			"weapon.baseAbi",
			"weapon.stability",
			"weapon.modifiers",
			"weapon.colorA",
			"weapon.colorB",
			"weapon.colorC",
		]);

const insertWeaponItem = async (data: WeaponItem): Promise<WeaponItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);
		const item = await insertItemQuery(trx, {
			...ItemSchema.parse(data),
			id: createId(),
			createdByAccountId: account.id,
			updatedByAccountId: account.id,
		}).executeTakeFirstOrThrow();
		const weapon = await insertWeaponQuery(trx, {
			...WeaponSchema.parse(data),
			itemId: item.id,
		}).executeTakeFirstOrThrow();
		return {
			...weapon,
			...item,
		};
	});
};

const updateWeaponItem = async (id: string, data: Partial<WeaponItem>): Promise<WeaponItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const weapon = await updateWeaponQuery(trx, id, WeaponSchema.parse(data)).executeTakeFirstOrThrow();
		const item = await updateItemQuery(trx, id, ItemSchema.parse(data)).executeTakeFirstOrThrow();
		return {
			...weapon,
			...item,
		};
	});
};

const deleteWeaponItem = async (id: string): Promise<WeaponItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteWeaponQuery(trx, id).executeTakeFirst();
		await deleteItemQuery(trx, id).executeTakeFirst();
		// 不知道为什么返回值的时候类型错误说id有问题，懒得写了
		return undefined;
	});
};

// 第二个类型参数 = 配置站点字典覆盖范围。声明 inheritsFrom 后，渲染器会在运行时自动把 item 的字典合并上来，
// 因此这里只需要提供 weapon 自己的字段字典。
export const WEAPON_DATA_CONFIG: TableDataConfig<WeaponItem, weapon> = (dictionary) => ({
	// 声明 weapon 与 item 是 1:1 继承关系；渲染器会自动：
	//   - 合并 item 的字典/字段生成器到 weapon（child 优先）
	//   - 从关联内容中排除 item 以及 armor/consumable 等同级子类（兄弟表自动推导）
	//   - 把 item 的父级关系（如 account）作为 weapon 的关联一并展示
	tableName: "weapon",
	inheritsFrom: { table: "item", via: "itemId" },
	dictionary: dictionary().db.weapon,
	dataSchema: WeaponItemSchema,
	primaryKey: "itemId",
	defaultData: WeaponItemDefaultData,
	queries: {
		get: (db, id) => selectWeaponItemQuery(db).where("weapon.itemId", "=", id),
		getAll: selectWeaponItemQuery,
		getParentsById: repositoryReaders.weapon.getParentsById,
		getChildrenById: repositoryReaders.weapon.getChildrenById,
	},
	fieldGroupMap: {
		基本信息: ["type", "name", "baseAbi", "stability", "itemSourceType", "dataSources", "details", "elementType"],
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
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 180 },
			{ accessorKey: "colorA", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorB", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorC", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: {
			field: "name",
			desc: false,
		},
		tdGenerator: {
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
			name: ({ cell, dic }) => (
				<div class="text-accent-color flex items-center gap-2">
					<div class="flex-none w-12 h-12 p-1 flex items-center justify-center rounded bg-area-color">
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
				type: ({ value, setValue }) => {
					const typeDictionary = dictionary().db.weapon.fields.type;
					return (
						<Select
							options={WEAPON_TYPE.map((type) => ({
								label: typeDictionary.enumMap[type],
								value: type,
							}))}
							value={value() as WeaponType}
							setValue={(v) => setValue(v as WeaponType)}
						/>
					);
				},
			},
		},
		onInsert: async (values) => insertWeaponItem(values),
		onUpdate: updateWeaponItem,
	},
	card: {
		relationOverrides: {
			hide: ["player_weapon", "account_create_data", "account_update_data"],
		},
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteWeaponItem,
		editAbleCallback: (data) => repositoryWriters.weapon.canEdit(data.itemId),
	},
});
