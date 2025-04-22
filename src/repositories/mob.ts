import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, mob } from "~/../db/kysely/kyesely";
import { statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { getDictionary, Locale } from "~/locales/i18n";
import { ConvertToAllDetail, DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";

export interface Mob extends DataType<mob> {
  MainTable: Awaited<ReturnType<typeof findMobs>>[number];
  MainForm: mob;
  Card: Awaited<ReturnType<typeof findMobById>>
}

export function mobSubRelations(eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_mobTozone")
        .innerJoin("zone", "_mobTozone.B", "zone.id")
        .where("_mobTozone.A", "=", id)
        .select("zone.name"),
    ).as("belongToZones"),
    jsonArrayFrom(
      eb
        .selectFrom("drop_item")
        .innerJoin("item", "item.id", "drop_item.itemId")
        .where("drop_item.dropById", "=", id)
        .selectAll("item"),
    ).as("dropItems"),
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .whereRef("id", "=", "mob.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistic"),
  ];
}

export async function findMobById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("mob")
    .where("id", "=", id)
    .selectAll("mob")
    .select((eb) => mobSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMobsLike(searchString: string) {
  const db = await getDB();
  const results = await db.selectFrom("mob").where("name", "like", `%${searchString}%`).selectAll().execute();
  return results;
}

export async function findMobs() {
  const db = await getDB();
  const result = await db.selectFrom("mob").selectAll("mob").execute();
  return result;
}

export async function updateMob(id: string, updateWith: Mob["Update"]) {
  const db = await getDB();
  return await db.updateTable("mob").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMob(trx: Transaction<DB>, newMob: Mob["Insert"]) {
  const statistic = await trx
    .insertInto("statistic")
    .values({
      id: createId(),
      updatedAt: new Date(),
      createdAt: new Date(),
      usageTimestamps: [],
      viewTimestamps: [],
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  const mob = await trx
    .insertInto("mob")
    .values({
      ...newMob,
      id: createId(),
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return mob;
}

export async function deleteMob(id: string) {
  const db = await getDB();
  return await db.deleteFrom("mob").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMob: Mob["Select"] = {
  id: "",
  name: "",
  type: "Boss",
  initialElement: "Normal",
  captureable: false,
  actions: [],
  baseLv: 0,
  experience: 0,
  radius: 0,
  maxhp: 0,
  physicalDefense: 0,
  physicalResistance: 0,
  magicalDefense: 0,
  magicalResistance: 0,
  criticalResistance: 0,
  avoidance: 0,
  dodge: 0,
  block: 0,
  normalAttackResistanceModifier: 0,
  physicalAttackResistanceModifier: 0,
  magicalAttackResistanceModifier: 0,
  partsExperience: 0,
  details: "",
  dataSources: "",
  statisticId: "",
  updatedByAccountId: "",
  createdByAccountId: "",
};
