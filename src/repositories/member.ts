import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, member } from "~/repositories/db/types";
import { defaultCharacter, characterSubRelations } from "./character";
import { jsonObjectFrom } from "kysely/helpers/postgres";

export type Member = Awaited<ReturnType<typeof findMemberById>>;
export type NewMember = Insertable<member>;
export type MemberUpdate = Updateable<member>;

export function memberSubRelations(eb: ExpressionBuilder<DB, "member">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("character")
        .whereRef("id", "=", "member.characterId")
        .selectAll("character")
        .select((subEb) => characterSubRelations(subEb, subEb.val(id))),
    ).as("character"),
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

export async function updateMember(id: string, updateWith: MemberUpdate) {
  return await db.updateTable("member").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMember(newMember: NewMember) {
  return await db.transaction().execute(async (trx) => {
    const character = await trx
      .insertInto("character")
      .values(defaultCharacter)
      .returningAll()
      .executeTakeFirstOrThrow();
    const member = await trx.insertInto("member").values({
      ...newMember,
      characterId: character.id,
    }).returningAll().executeTakeFirstOrThrow();
    return { ...member, character };
  });
}

export async function deleteMember(id: string) {
  return await db.deleteFrom("member").where("id", "=", id).returningAll().executeTakeFirst();
}
// Default
export const defaultMember: Member = {
  id: "",
  character: defaultCharacter,
  characterId: "",
  flow: [
    {
      id: "systemStart",
      componentType: "task",
      type: "message",
      name: "开始!",
      properties: { message: "开始!" },
    },
    {
      id: "systemEnd",
      componentType: "task",
      type: "message",
      name: "结束",
      properties: { message: "结束" },
    },
  ],
};
