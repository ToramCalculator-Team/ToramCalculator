import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/generated/kysely/kyesely";
import { defaultStatistics } from "./statistic";
import { defaultAccount } from "./account";
import { itemSubRelations } from "./item";
import { ModifyKeys } from "./untils";
import { I18nString, MaterialType } from "./enums";

export type Material = ModifyKeys<
  Awaited<ReturnType<typeof findMaterialById>>,
  {
    name: I18nString;
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
export const defaultMaterial: Record<MaterialType, Material> = {
  Magic: {
    name: {
      "zh-CN": "默认魔素素材",
      "zh-TW": "預設魔素素材",
      en: "defaultMagic",
      ja: "デフォルト魔素素材",
    },
    id: "defaultMagicId",
    itemId: "defaultMaterialId",
    material: "Magic",
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
    name: {
      "zh-CN": "默认布料素材",
      "zh-TW": "預設布料素材",
      en: "defaultCloth",
      ja: "デフォルト布料素材",
    },
    id: "defaultClothId",
    itemId: "defaultMaterialId",
    material: "Cloth",
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
    name: {
      "zh-CN": "默认兽品素材",
      "zh-TW": "預設兽品素材",
      en: "defaultBeast",
      ja: "デフォルト兽品素材",
    },
    id: "defaultBeastId",
    itemId: "defaultMaterialId",
    material: "Beast",
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
    name: {
      "zh-CN": "默认木材素材",
      "zh-TW": "預設木材素材",
      en: "defaultWood",
      ja: "デフォルト木材素材",
    },
    id: "defaultWoodId",
    itemId: "defaultMaterialId",
    material: "Wood",
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
    name: {
      "zh-CN": "默认药品素材",
      "zh-TW": "預設药品素材",
      en: "defaultDrug",
      ja: "デフォルト药素材",
    },
    id: "defaultDrugId",
    itemId: "defaultMaterialId",
    material: "Drug",
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
    name: {
      "zh-CN": "默认金属素材",
      "zh-TW": "預設金属素材",
      en: "defaultMetal",
      ja: "デフォルト金属素材",
    },
    id: "defaultMetalId",
    itemId: "defaultMaterialId",
    material: "Metal",
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
