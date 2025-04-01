import { Expression, ExpressionBuilder } from "kysely";
import { db } from "./database";
import { DB, member } from "~/../db/clientDB/kysely/kyesely";
import { playerSubRelations } from "./player";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";

export interface Member extends DataType<member> {
  MainTable: Awaited<ReturnType<typeof findMembers>>[number];
  MainForm: member;
}

export function memberSubRelations(eb: ExpressionBuilder<DB, "member">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("player")
        .whereRef("id", "=", "member.playerId")
        .selectAll("player")
        .select((subEb) => playerSubRelations(subEb, subEb.val(id))),
    ).as("player"),
    jsonObjectFrom(eb.selectFrom("mercenary").whereRef("id", "=", "member.mercenaryId").selectAll("mercenary")).as(
      "mercenary",
    ),
    jsonObjectFrom(eb.selectFrom("mercenary").whereRef("id", "=", "member.partnerId").selectAll("mercenary")).as(
      "partner",
    ),
    jsonObjectFrom(eb.selectFrom("mob").whereRef("id", "=", "member.mobId").selectAll("mob")).as("mob"),
  ];
}

export async function findMemberById(id: string) {
  return await db
    .selectFrom("member")
    .where("id", "=", id)
    .selectAll("member")
    .select((eb) => memberSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMembers() {
  return await db.selectFrom("member").selectAll("member").execute();
}

export async function updateMember(id: string, updateWith: Member["Update"]) {
  return await db.updateTable("member").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMember(newMember: Member["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const member = await trx
      .insertInto("member")
      .values({
        ...newMember,
        // characterId: character.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return member;
  });
}

export async function deleteMember(id: string) {
  return await db.deleteFrom("member").where("id", "=", id).returningAll().executeTakeFirst();
}
// Default
export const defaultMember: Member["Select"] = {
  id: "",
  name: "",
  teamId: "",
  playerId: "",
  mobId: "",
  mobDifficultyFlag: "Easy",
  mercenaryId: "",
  partnerId: "",
  order: 0,
};
