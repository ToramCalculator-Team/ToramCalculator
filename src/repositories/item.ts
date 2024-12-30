import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistic } from "./statistic";
import { defaultAccount } from "./account";
import { ItemType } from "./enums";

export type Item = Awaited<ReturnType<typeof findItemById>>;
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
    name: "默认单手剑（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  TwoHandSword: {
    id: "defaultTwoHandSwordId",
    name: "默认大剑（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Bow: {
    id: "defaultBowId",
    name: "默认弓（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Bowgun: {
    id: "defaultBowgunId",
    name: "默认弩（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Rod: {
    id: "defaultRodId",
    name: "默认杖（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Magictool: {
    id: "defaultMagictoolId",
    name: "默认魔导具（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Knuckle: {
    id: "defaultKnuckleId",
    name: "默认拳套（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Halberd: {
    id: "defaultHalberdId",
    name: "默认枪（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Katana: {
    id: "defaultKatanaId",
    name: "默认拔刀剑（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Arrow: {
    id: "defaultArrowId",
    name: "默认箭（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  ShortSword: {
    id: "defaultShortSwordId",
    name: "默认小刀（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  NinjutsuScroll: {
    id: "defaultNinjutsuScrollId",
    name: "默认卷轴（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Shield: {
    id: "defaultShieldId",
    name: "默认盾（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  Armor: {
    id: "defaultArmorId",
    name: "默认防具（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  AddEquip: {
    id: "defaultAddEquipId",
    name: "默认追加装备（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  SpecialEquip: {
    id: "defaultSpecialEquipId",
    name: "默认特殊装备（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  NormalCrystal: {
    id: "defaultNormalCrystalId",
    name: "默认普通锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  WeaponCrystal: {
    id: "defaultWeaponCrystalId",
    name: "默认武器锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  ArmorCrystal: {
    id: "defaultArmorCrystalId",
    name: "默认防具锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  AddEquipCrystal: {
    id: "defaultAddEquipCrystalId",
    name: "默认追加装备锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  SpecialCrystal: {
    id: "defaultSpecialCrystalId",
    name: "默认特殊锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  PowerUpNormalCrystal: {
    id: "defaultPowerUpNormalCrystalId",
    name: "默认一般强化锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  PowerUpWeaponCrystal: {
    id: "defaultPowerUpWeaponCrystalId",
    name: "默认武器强化锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  PowerUpArmorCrystal: {
    id: "defaultPowerUpArmorCrystalId",
    name: "默认防具强化锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  PowerUpAddEquipCrystal: {
    id: "defaultPowerUpAddEquipCrystalId",
    name: "默认追加装备强化锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
  PowerUpSpecialCrystal: {
    id: "defaultPowerUpSpecialCrystalId",
    name: "默认特殊强化锻晶（缺省值）",
    dataSources: "",
    details: "",
    dropBy: [],
    rewardBy: [],
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
  },
};
