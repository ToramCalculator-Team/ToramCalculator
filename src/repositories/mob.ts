import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, mob } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { defaultImage } from "./image";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

export type Mob = Awaited<ReturnType<typeof findMobById>>;
export type NewMob = Insertable<mob>;
export type MobUpdate = Updateable<mob>;

export function mobSubRelations(eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb.selectFrom("_mobTozone")
        .innerJoin("zone", "_mobTozone.B", "zone.id")
        .where("_mobTozone.A", "=", id)
      .select("zone.name")
    ).as("usedInZones"),
    jsonArrayFrom(
      eb
        .selectFrom("drop_item")
        .innerJoin("item", "item.id", "drop_item.itemId")
        .where("drop_item.dropById", "=", id)
        .select("item.name"),
    ).as("dropItems"),
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "mob.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistics"),
    jsonObjectFrom(eb.selectFrom("image").whereRef("id", "=", "mob.imageId").selectAll("image"))
      .$notNull()
      .as("image"),
  ];
}

export async function findMobById(id: string) {
  return await db
    .selectFrom("mob")
    .where("id", "=", id)
    .selectAll("mob")
    .select((eb) => mobSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMobs() {
  return await db
    .selectFrom("mob")
    .selectAll("mob")
    .select((eb) => mobSubRelations(eb, eb.val("mob.id")))
    .execute();
}

export async function updateMob(id: string, updateWith: MobUpdate) {
  return await db.updateTable("mob").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMob(newMob: NewMob) {
  return await db.transaction().execute(async (trx) => {
    const mob = await trx.insertInto("mob").values(newMob).returningAll().executeTakeFirstOrThrow();
    const statistics = await trx
      .insertInto("statistics")
      .values(defaultStatistics)
      .returningAll()
      .executeTakeFirstOrThrow();
    const image = await trx.insertInto("image").values(defaultImage).returningAll().executeTakeFirstOrThrow();
    return { ...mob, statistics, image };
  });
}

export async function deleteMob(id: string) {
  return await db.deleteFrom("mob").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMob: Mob = {
  id: "defaultMobId",
  name: "defaultMobName",
  mobType: "Boss",
  flow: "",
  baseLv: 0,
  experience: 0,
  address: "defaultAddress",
  element: "Normal",
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
  difficultyOfTank: 0,
  difficultyOfMelee: 0,
  difficultyOfRanged: 0,
  possibilityOfRunningAround: 0,
  usedInZones: [],
  dropItems: [],
  extraDetails: "defaultExtraDetails",
  dataSources: "defaultDataSources",
  updatedAt: new Date(),
  createdAt: new Date(),
  statisticsId: defaultStatistics.id,
  statistics: defaultStatistics,
  imageId: defaultImage.id,
  image: defaultImage,
  updatedByAccountId: null,
  createdByAccountId: null,
};
