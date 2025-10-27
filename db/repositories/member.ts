import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, member } from "@db/generated/zod/index";
import { PlayerWithRelationsSchema, playerSubRelations } from "./player";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { MercenaryWithRelationsSchema, mercenarySubRelations } from "./mercenary";
import { MobWithRelationsSchema, mobSubRelations } from "./mob";
import { MemberSchema } from "@db/generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Member = Selectable<member>;
export type MemberInsert = Insertable<member>;
export type MemberUpdate = Updateable<member>;

// 2. 关联查询定义
const memberSubRelationDefs = defineRelations({
  player: {
    build: (eb: ExpressionBuilder<DB, "member">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("player")
          .whereRef("id", "=", "member.playerId")
          .selectAll("player")
          .select((subEb) => playerSubRelations(subEb, subEb.val("player.id")))
      ).as("player"),
    schema: PlayerWithRelationsSchema.nullable().describe("玩家"),
  },
  mercenary: {
    build: (eb: ExpressionBuilder<DB, "member">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("mercenary")
          .whereRef("id", "=", "member.mercenaryId")
          .selectAll("mercenary")
          .select((subEb) => mercenarySubRelations(subEb, subEb.val("mercenary.templateId")))
      ).as("mercenary"),
    schema: MercenaryWithRelationsSchema.nullable().describe("佣兵"),
  },
  partner: {
    build: (eb: ExpressionBuilder<DB, "member">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("mercenary")
          .whereRef("id", "=", "member.partnerId")
          .selectAll("mercenary")
          .select((subEb) => mercenarySubRelations(subEb, subEb.val("mercenary.templateId")))
      ).as("partner"),
    schema: MercenaryWithRelationsSchema.nullable().describe("合作伙伴"),
  },
  mob: {
    build: (eb: ExpressionBuilder<DB, "member">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("mob")
          .whereRef("id", "=", "member.mobId")
          .selectAll("mob")
          .select((subEb) => mobSubRelations(subEb, subEb.val("mob.id")))
      ).as("mob"),
    schema: MobWithRelationsSchema.nullable().describe("怪物"),
  },
});

const memberRelationsFactory = makeRelations(memberSubRelationDefs);
export const MemberWithRelationsSchema = z.object({
  ...MemberSchema.shape,
  ...memberRelationsFactory.schema.shape,
});
export const memberSubRelations = memberRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findMemberById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("member")
    .where("id", "=", id)
    .selectAll("member")
    .executeTakeFirst() || null;
}

export async function findMembers(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("member")
    .selectAll("member")
    .execute();
}

export async function insertMember(trx: Transaction<DB>, data: MemberInsert) {
  return await trx
    .insertInto("member")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createMember(trx: Transaction<DB>, data: MemberInsert) {
  return await trx
    .insertInto("member")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateMember(trx: Transaction<DB>, id: string, data: MemberUpdate) {
  return await trx
    .updateTable("member")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteMember(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("member")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findMemberWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("member")
    .where("id", "=", id)
    .selectAll("member")
    .select((eb) => memberSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type MemberWithRelations = Awaited<ReturnType<typeof findMemberWithRelations>>;
