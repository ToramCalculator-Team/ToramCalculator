import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, member } from "../../db/generated/kysely/kyesely";
import { playerSubRelations } from "./player";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";
import { mercenarySubRelations } from "./mercenary";
import { mobSubRelations } from "./mob";

export type MemberWithRelations = Awaited<ReturnType<typeof findMemberById>>;

export interface Member extends DataType<member> {
  MainTable: Awaited<ReturnType<typeof findMembers>>[number];
  MainForm: Awaited<ReturnType<typeof findMemberById>>;
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
    jsonObjectFrom(
      eb
        .selectFrom("mercenary")
        .whereRef("id", "=", "member.mercenaryId")
        .selectAll("mercenary")
        .select((subEb) => mercenarySubRelations(subEb)),
    ).as("mercenary"),
    jsonObjectFrom(
      eb
        .selectFrom("mercenary")
        .whereRef("id", "=", "member.partnerId")
        .selectAll("mercenary")
        .select((subEb) => mercenarySubRelations(subEb)),
    ).as("partner"),
    jsonObjectFrom(
      eb
        .selectFrom("mob")
        .whereRef("id", "=", "member.mobId")
        .selectAll("mob")
        .select((subEb) => mobSubRelations(subEb, subEb.val(id))),
    ).as("mob"),
  ];
}

export async function findMemberById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("member")
    .where("id", "=", id)
    .selectAll("member")
    .select((eb) => memberSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMembers() {
  const db = await getDB();
  return await db.selectFrom("member").selectAll("member").execute();
}

export async function updateMember(id: string, updateWith: Member["Update"]) {
  const db = await getDB();
  return await db.updateTable("member").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMember(newMember: Member["Insert"]) {
  const db = await getDB();
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
  const db = await getDB();
  return await db.deleteFrom("member").where("id", "=", id).returningAll().executeTakeFirst();
}
