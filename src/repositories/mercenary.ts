import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, mercenary } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

export type Mercenary = Awaited<ReturnType<typeof findMercenaryById>>;
export type NewMercenary = Insertable<mercenary>;
export type MercenaryUpdate = Updateable<mercenary>;

export function mercenarySubRelations(eb: ExpressionBuilder<DB, "mercenary">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_memberTomercenary")
        .innerJoin("member", "_memberTomercenary.A", "member.id")
        .where("_memberTomercenary.B", "=", id)
        .select(["member.characterId", "member.mercenaryId", "member.mobId", "member.mobDifficultyFlag"]),
    ).as("members"),
  ];
}

export async function findMercenaryById(id: string) {
  return await db
    .selectFrom("mercenary")
    .where("id", "=", id)
    .selectAll("mercenary")
    .select((eb) => mercenarySubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMercenarys() {
  return await db
    .selectFrom("mercenary")
    .selectAll("mercenary")
    .select((eb) => mercenarySubRelations(eb, eb.val("mercenary.id")))
    .execute();
}

export async function updateMercenary(id: string, updateWith: MercenaryUpdate) {
  return await db.updateTable("mercenary").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMercenary(newMercenary: NewMercenary) {
  return await db.transaction().execute(async (trx) => {
    const mercenary = await trx.insertInto("mercenary").values(newMercenary).returningAll().executeTakeFirstOrThrow();
    return mercenary;
  });
}

export async function deleteMercenary(id: string) {
  return await db.deleteFrom("mercenary").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMercenary: Mercenary = {
  id: "defaultMercenaryId",
  name: null,
  gems: [],
  members: [],
};
