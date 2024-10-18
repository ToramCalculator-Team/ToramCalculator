import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, mob } from "~/repositories/db/types";
import { defaultMonster, monsterSubRelations } from "./monster";
import { jsonObjectFrom } from "kysely/helpers/postgres";

export type Mob = Awaited<ReturnType<typeof findMobById>>;
export type NewMob = Insertable<mob>;
export type MobUpdate = Updateable<mob>;

export function MobSubRelations(eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("monster")
        .whereRef("id", "=", "mob.monsterId")
        .selectAll("monster")
        .select((subEb) => monsterSubRelations(subEb, subEb.val(id))),
    ).as("monster"),
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
    const monster = await trx
      .insertInto("monster")
      .values(defaultMonster)
      .returningAll()
      .executeTakeFirstOrThrow();
    const mob = await trx.insertInto("mob").values({
      ...newMob,
      monsterId: monster.id,
    }).returningAll().executeTakeFirstOrThrow();
    return { ...mob, monster };
  });
}

export async function deleteMob(id: string) {
  return await db.deleteFrom("mob").where("id", "=", id).returningAll().executeTakeFirst();
}

// Default
export const defaultMob: Mob = {
  id: "defaultMobId",
  monster: defaultMonster,
  monsterId: defaultMonster.id,
  star: 4,
  flow: "",
};
