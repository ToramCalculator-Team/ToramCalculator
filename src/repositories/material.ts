import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/kysely/kyesely";
import { defaultStatistics } from "./statistic";
import { defaultAccount } from "./account";
import { itemSubRelations } from "./item";
import { ModifyKeys } from "./untils";
import { Enums } from "./enums";

export type Material = ModifyKeys<
  Awaited<ReturnType<typeof findMaterialById>>,
  {
    type: Enums["MaterialType"];
  }
>;
export type NewMaterial = Insertable<item>;
export type MaterialUpdate = Updateable<item>;

export function materialSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [];
}

export async function findMaterialById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("material", "item.id", "material.itemId")
    .where("id", "=", id)
    .selectAll(["item", "material"])
    .select((eb) => materialSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateMaterial(id: string, updateWith: MaterialUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createMaterial(newMaterial: NewMaterial) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newMaterial).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteMaterial(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMaterial: Record<Enums["MaterialType"], Material> = {
  Magic: {
    name: "defaultMagic",
    id: "defaultMagicId",
    itemId: "defaultMaterialId",
    type: "Magic",
    ptValue: 0,
    price: 0,
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Magic,
    statisticId: defaultStatistics.Magic.id,
  },
  Cloth: {
    name: "defaultCloth",
    id: "defaultClothId",
    itemId: "defaultMaterialId",
    type: "Cloth",
    ptValue: 0,
    price: 0,
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Cloth,
    statisticId: defaultStatistics.Cloth.id,
  },
  Beast: {
    name: "defaultBeast",
    id: "defaultBeastId",
    itemId: "defaultMaterialId",
    type: "Beast",
    ptValue: 0,
    price: 0,
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Beast,
    statisticId: defaultStatistics.Beast.id,
  },
  Wood: {
    name: "defaultWood",
    id: "defaultWoodId",
    itemId: "defaultMaterialId",
    type: "Wood",
    ptValue: 0,
    price: 0,
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Wood,
    statisticId: defaultStatistics.Wood.id,
  },
  Drug: {
    name: "defaultDrug",
    id: "defaultDrugId",
    itemId: "defaultMaterialId",
    type: "Drug",
    ptValue: 0,
    price: 0,
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Drug,
    statisticId: defaultStatistics.Drug.id,
  },
  Metal: {
    name: "defaultMetal",
    id: "defaultMetalId",
    itemId: "defaultMaterialId",
    type: "Metal",
    ptValue: 0,
    price: 0,
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Metal,
    statisticId: defaultStatistics.Metal.id,
  }
};
