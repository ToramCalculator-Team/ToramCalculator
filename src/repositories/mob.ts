import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, mob } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonObjectFrom } from "kysely/helpers/postgres";

export type Mob = Awaited<ReturnType<typeof findMobById>>;
export type NewMob = Insertable<mob>;
export type MobUpdate = Updateable<mob>;

export function MobSubRelations(eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "mob.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).as("statistics"),
  ];
}

export async function findMobById(id: string) {
  return await db
    .selectFrom("mob")
    .where("id", "=", id)
    .selectAll("mob")
    .select((eb) => MobSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
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
    return { ...mob, statistics };
  });
}

export async function deleteMob(id: string) {
  return await db.deleteFrom("mob").where("id", "=", id).returningAll().executeTakeFirst();
}

// Default
export const defaultMob: Mob = {
  id: "",
  monster: defaultMonster,
  monsterId: "",
  star: 1,
  flow: "",
};
