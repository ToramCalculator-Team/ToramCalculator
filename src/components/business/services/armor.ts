import { getDB } from "@db/repositories/database";
import { insertItem, type Item } from "@db/generated/repositories/item";
import { insertArmor, updateArmor, type Armor } from "@db/generated/repositories/armor";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { createId } from "@paralleldrive/cuid2";
import { getUserContext } from "./context";
import { defaultData } from "@db/defaultData";
import type { ItemSourceType } from "@db/schema/enums";

/**
 * 创建防具的参数
 */
export interface CreateArmorParams {
	name: string;
	baseAbi: number;
	modifiers?: string[];
	colorA?: number;
	colorB?: number;
	colorC?: number;
	itemSourceType?: ItemSourceType;
	dataSources?: string;
	details?: string | null;
}

/**
 * 创建防具结果
 */
export interface CreateArmorResult {
	item: Item;
	armor: Armor;
}

/**
 * 创建新的 Armor（包含父表 Item）
 * @param params 防具参数
 * @returns 创建的 Item 和 Armor
 */
export const createArmor = async (params: CreateArmorParams): Promise<CreateArmorResult> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);

		// 1. 创建统计记录
		const statistic = await insertStatistic(
			{
				...defaultData.statistic,
				id: createId(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			trx,
		);

		// 2. 创建父表 item
		const item = await insertItem(
			{
				id: createId(),
				itemType: "Armor",
				itemSourceType: params.itemSourceType || "Drop",
				name: params.name,
				dataSources: params.dataSources || "",
				details: params.details || null,
				statisticId: statistic.id,
				createdByAccountId: account.id,
				updatedByAccountId: account.id,
			},
			trx,
		);

		// 3. 创建 armor
		const armor = await insertArmor(
			{
				name: params.name,
				baseAbi: params.baseAbi,
				modifiers: params.modifiers || [],
				colorA: params.colorA || 0,
				colorB: params.colorB || 0,
				colorC: params.colorC || 0,
				itemId: item.id,
			},
			trx,
		);

		return { item, armor };
	});
};

/**
 * 更新防具（同时更新 Item 和 Armor）
 * @param itemId Item ID
 * @param params 更新参数
 * @returns 更新后的 Item 和 Armor
 */
export const updateArmorWithItem = async (
	itemId: string,
	params: Partial<CreateArmorParams>,
): Promise<CreateArmorResult> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);

		// 1. 更新 item
		const item = await db
			.updateTable("item")
			.set({
				name: params.name,
				dataSources: params.dataSources,
				details: params.details,
				updatedByAccountId: account.id,
			})
			.where("id", "=", itemId)
			.returningAll()
			.executeTakeFirstOrThrow();

		// 2. 更新 armor
		const armorUpdate: Partial<Armor> = {};
		if (params.name !== undefined) armorUpdate.name = params.name;
		if (params.baseAbi !== undefined) armorUpdate.baseAbi = params.baseAbi;
		if (params.modifiers !== undefined) armorUpdate.modifiers = params.modifiers;
		if (params.colorA !== undefined) armorUpdate.colorA = params.colorA;
		if (params.colorB !== undefined) armorUpdate.colorB = params.colorB;
		if (params.colorC !== undefined) armorUpdate.colorC = params.colorC;

		const armor = await updateArmor(itemId, armorUpdate, trx);

		return { item, armor };
	});
};
