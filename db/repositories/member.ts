import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, member } from "../generated/kysely/kyesely";
import { playerSubRelations } from "./player";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { mercenarySubRelations } from "./mercenary";
import { mobSubRelations } from "./mob";

// 1. 类型定义
export type Member = Selectable<member>;
export type MemberInsert = Insertable<member>;
export type MemberUpdate = Updateable<member>;
// 关联查询类型
export type MemberWithRelations = Awaited<ReturnType<typeof findMemberWithRelations>>;

// 2. 关联查询定义
export function memberSubRelations(eb: ExpressionBuilder<DB, "member">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("player")
        .whereRef("id", "=", "member.playerId")
        .selectAll("player")
        .select((subEb) => playerSubRelations(subEb, subEb.val("player.id"))),
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
        .select((subEb) => mobSubRelations(subEb, subEb.val("mob.id"))),
    ).as("mob"),
  ];
}

// 3. 基础 CRUD 方法
export async function findMemberById(id: string): Promise<Member | null> {
  const db = await getDB();
  return await db
    .selectFrom("member")
    .where("id", "=", id)
    .selectAll("member")
    .executeTakeFirst() || null;
}

export async function findMembers(): Promise<Member[]> {
  const db = await getDB();
  return await db
    .selectFrom("member")
    .selectAll("member")
    .execute();
}

export async function insertMember(trx: Transaction<DB>, data: MemberInsert): Promise<Member> {
  return await trx
    .insertInto("member")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createMember(trx: Transaction<DB>, data: MemberInsert): Promise<Member> {
  return await trx
    .insertInto("member")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateMember(trx: Transaction<DB>, id: string, data: MemberUpdate): Promise<Member> {
  return await trx
    .updateTable("member")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteMember(trx: Transaction<DB>, id: string): Promise<Member | null> {
  return await trx
    .deleteFrom("member")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findMemberWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("member")
    .where("id", "=", id)
    .selectAll("member")
    .select((eb) => memberSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
