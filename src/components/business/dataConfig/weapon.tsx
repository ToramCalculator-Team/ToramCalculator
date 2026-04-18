import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { deleteWeapon, insertWeapon, updateWeapon } from "@db/generated/repositories/weapon";
import { ItemSchema, WeaponSchema, type weapon } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { type ElementType, WEAPON_TYPE, type WeaponType } from "@db/schema/enums";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const WeaponItemSchema = ItemSchema.extend(WeaponSchema.shape);
type WeaponItem = z.output<typeof WeaponItemSchema>;

const WeaponItemDefaultData: WeaponItem = {
	...defaultData.weapon,
	...defaultData.item,
};

const getWeaponItem = async (id: string): Promise<WeaponItem> => {
	const db = await getDB();
	const weapon = await db.selectFrom("weapon").where("itemId", "=", id).selectAll().executeTakeFirstOrThrow();
	const item = await db.selectFrom("item").where("id", "=", weapon.itemId).selectAll().executeTakeFirstOrThrow();
	return {
		...weapon,
		...item,
	};
};

const getAllWeaponItems = async (): Promise<WeaponItem[]> => {
	const db = await getDB();
	const weaponItems = await db
		.selectFrom("weapon")
		.innerJoin("item", (join) => join.onRef("weapon.itemId", "=", "item.id"))
		.selectAll()
		.execute();
	return weaponItems;
};

const insertWeaponItem = async (data: WeaponItem): Promise<WeaponItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);
		const statistic = await insertStatistic(
			{
				...defaultData.statistic,
				id: createId(),
			},
			trx,
		);
		const item = await insertItem(
			{
				...ItemSchema.parse(data),
				statisticId: statistic.id,
				createdByAccountId: account.id,
				updatedByAccountId: account.id,
			},
			trx,
		);
		const weapon = await insertWeapon(
			{
				...WeaponSchema.parse(data),
				itemId: item.id,
			},
			trx,
		);
		return {
			...weapon,
			...item,
		};
	});
};

const updateWeaponItem = async (id: string, data: Partial<WeaponItem>): Promise<WeaponItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const weapon = await updateWeapon(id, WeaponSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...weapon,
			...item,
		};
	});
};

const deleteWeaponItem = async (id: string): Promise<WeaponItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteWeapon(id, trx);
		await deleteItem(id, trx);
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
	//   - 把 item 的父级关系（如 statistic、account）作为 weapon 的关联一并展示
	inheritsFrom: { table: "item", via: "itemId" },
	relationOverrides: {
		hide: ["player_weapon","statistic","account_create_data","account_update_data"],
	},
	dictionary: dictionary().db.weapon,
	dataSchema: WeaponItemSchema,
	primaryKey: "itemId",
	defaultData: WeaponItemDefaultData,
	dataFetcher: {
		get: getWeaponItem,
		getAll: getAllWeaponItems,
		insert: insertWeaponItem,
		update: updateWeaponItem,
		delete: deleteWeaponItem,
		// weapon join item。两张表都有 name 列，live 订阅对重复列名严格，所以显式选列：
		//   - item.*（item.name 作为最终 name）
		//   - weapon 除 name 之外的列（name 由 item 提供即可）
		liveQuery: (db) =>
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
				]),
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
		fieldGenerator: {
			type: (value, setValue, _validationMessage, dictionary, _dataSchema) => {
				return (
					<Select
						options={WEAPON_TYPE.map((type) => ({
							label: dictionary.fields.type.enumMap[type],
							value: type,
						}))}
						value={value()}
						setValue={(v) => setValue(v as WeaponType)}
					/>
				);
			},
		},
		onInsert: async (values) => insertWeaponItem(values),
		onUpdate: updateWeaponItem,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteWeaponItem,
		openEditor: (data) =>
			setStore("pages", "formGroup", store.pages.formGroup.length, {
				type: "weapon",
				data,
			}),
		editAbleCallback: (data) => repositoryMethods.weapon.canEdit(data.itemId),
	},
});
