import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics } from "./statistic";
import { defaultAccount } from "./account";
import { ItemType, I18nString } from "./enums";
import { ModifyKeys } from "./untils";

export type Item = ModifyKeys<Awaited<ReturnType<typeof findItemById>>, {
  
}>;
export type NewItem = Insertable<item>;
export type ItemUpdate = Updateable<item>;

export function itemSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonObjectFrom(eb.selectFrom("statistic").whereRef("id", "=", "item.statisticId").selectAll("statistic"))
      .$notNull()
      .as("statistic"),
    jsonArrayFrom(
      eb
        .selectFrom("drop_item")
        .innerJoin("mob", "drop_item.dropById", "mob.id")
        .where("drop_item.itemId", "=", id)
        .select(["mob.id", "mob.name"]),
    ).as("dropBy"),
    jsonArrayFrom(
      eb
        .selectFrom("reward")
        .innerJoin("task", "reward.taskId", "task.id")
        .innerJoin("npc", "task.npcId", "npc.id")
        .where("reward.itemId", "=", id)
        .select(["npc.id", "npc.name", "task.id", "task.name"]),
    ).as("rewardBy"),
  ];
}

export async function findItemById(id: string) {
  return await db
    .selectFrom("item")
    .where("id", "=", id)
    .selectAll("item")
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateItem(id: string, updateWith: ItemUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createItem(newItem: NewItem) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newItem).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteItem(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultItems: Record<ItemType, Item> = {
  OneHandSword: {
    id: "defaultOneHandSwordId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  TwoHandSword: {
    id: "defaultTwoHandSwordId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Bow: {
    id: "defaultBowId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Bowgun: {
    id: "defaultBowgunId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Rod: {
    id: "defaultRodId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Magictool: {
    id: "defaultMagictoolId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Knuckle: {
    id: "defaultKnuckleId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Halberd: {
    id: "defaultHalberdId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Katana: {
    id: "defaultKatanaId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Arrow: {
    id: "defaultArrowId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  ShortSword: {
    id: "defaultShortSwordId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  NinjutsuScroll: {
    id: "defaultNinjutsuScrollId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Shield: {
    id: "defaultShieldId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  Armor: {
    id: "defaultArmorId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  AddEquip: {
    id: "defaultAddEquipId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  SpecialEquip: {
    id: "defaultSpecialEquipId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  NormalCrystal: {
    id: "defaultNormalCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  WeaponCrystal: {
    id: "defaultWeaponCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  ArmorCrystal: {
    id: "defaultArmorCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  AddEquipCrystal: {
    id: "defaultAddEquipCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  SpecialCrystal: {
    id: "defaultSpecialCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  PowerUpNormalCrystal: {
    id: "defaultPowerUpNormalCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  PowerUpWeaponCrystal: {
    id: "defaultPowerUpWeaponCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  PowerUpArmorCrystal: {
    id: "defaultPowerUpArmorCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  PowerUpAddEquipCrystal: {
    id: "defaultPowerUpAddEquipCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
  PowerUpSpecialCrystal: {
    id: "defaultPowerUpSpecialCrystalId",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics,
    statisticId: defaultStatistics.id,
  },
};
