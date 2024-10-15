import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { monster } from "~/repositories/db/types";
import { defaultStatistics } from "./statistics";
import { defaultImage } from "./image";

export type Monster = Awaited<ReturnType<typeof findMonsterById>>;
export type NewMonster = Insertable<monster>;
export type MonsterUpdate = Updateable<monster>;

export async function findMonsterById(id: string) {
  const monster = await db.selectFrom("monster").where("id", "=", id).selectAll().executeTakeFirst();
  if (!monster) {
    return null;
  }
  const statistics = await db
    .selectFrom("statistics")
    .where("id", "=", monster.statisticsId)
    .selectAll()
    .executeTakeFirst();
  
  const image = await db
    .selectFrom("image")
    .where("id", "=", monster.imageId)
    .selectAll()
    .executeTakeFirst();

  return { ...monster, statistics, image };
}

export async function updateMonster(id: string, updateWith: MonsterUpdate) {
  return await db.updateTable("monster").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMonster(newMonster: NewMonster) {
  return await db.transaction().execute(async (trx) => {
    const monster = await trx.insertInto("monster").values(newMonster).returningAll().executeTakeFirstOrThrow();
    const statistics = await trx.insertInto("statistics").values(defaultStatistics).returningAll().executeTakeFirstOrThrow();
    const image = await trx.insertInto("image").values(defaultImage).returningAll().executeTakeFirstOrThrow();
    return { ...monster, statistics, image };
  })
}

export async function deleteMonster(id: string) {
  return await db.deleteFrom("monster").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMonster: Monster = {
  id: "",
  name: "",
  monsterType: "COMMON_MOBS",
  baseLv: 0,
  experience: 0,
  address: "",
  element: "NO_ELEMENT",
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
  difficultyOfTank: 0,
  difficultyOfMelee: 0,
  difficultyOfRanged: 0,
  possibilityOfRunningAround: 0,
  extraDetails: "",
  dataSources: "",
  updatedAt: new Date(),
  createdAt: new Date(),
  updatedByUserId: null,
  createdByUserId: null,
  statisticsId: "",
  statistics: defaultStatistics,
  imageId: "",
  image: defaultImage,
}