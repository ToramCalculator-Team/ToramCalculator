import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, mercenary } from "~/../db/clientDB/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { characterSubRelations, defaultCharacter } from "./character";
import { DataType } from "./untils";

export interface Mercenary extends DataType<mercenary> {
  MainTable: Awaited<ReturnType<typeof findMercenarys>>[number]
  MainForm: mercenary
}

export function mercenarySubRelations(eb: ExpressionBuilder<DB, "mercenary">) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("character")
        .whereRef("character.id", "=", "mercenary.templateId")
        .selectAll("character")
        .select((subEb) => characterSubRelations(subEb, subEb.val("character.id"))),
    ).as("template"),
  ];
}

export async function findMercenaryById(id: string) {
  return await db
    .selectFrom("mercenary")
    .where("mercenary.templateId", "=", id)
    .selectAll("mercenary")
    .select((eb) => mercenarySubRelations(eb))
    .executeTakeFirstOrThrow();
}

export async function findMercenarys() {
  return await db
    .selectFrom("mercenary")
    .selectAll("mercenary")
    .select((eb) => mercenarySubRelations(eb))
    .execute();
}

export async function updateMercenary(id: string, updateWith: Mercenary["Update"]) {
  return await db.updateTable("mercenary").set(updateWith).where("mercenary.templateId", "=", id).returningAll().executeTakeFirst();
}

export async function createMercenary(newMercenary: Mercenary["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const mercenary = await trx.insertInto("mercenary").values(newMercenary).returningAll().executeTakeFirstOrThrow();
    return mercenary;
  });
}

export async function deleteMercenary(id: string) {
  return await db.deleteFrom("mercenary").where("mercenary.templateId", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMercenary: Mercenary["Insert"] = {
  type: "Tank",
  templateId: defaultCharacter.id,
  skillAId: "",
  skillAType: "Active",
  skillBId: "",
  skillBType: "Active",
};
