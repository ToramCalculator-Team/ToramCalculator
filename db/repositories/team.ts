import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, team } from "../generated/kysely/kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { MemberRelationsSchema, memberSubRelations } from "./member";
import { z } from "zod/v3";
import { teamSchema } from "@db/generated/zod";

// 1. 类型定义
export type Team = Selectable<team>;
export type TeamInsert = Insertable<team>;
export type TeamUpdate = Updateable<team>;
// 关联查询类型
export type TeamWithRelations = Awaited<ReturnType<typeof findTeamWithRelations>>;
export const TeamRelationsSchema = z.object({
  ...teamSchema.shape,
  members: z.array(MemberRelationsSchema),
});

// 2. 关联查询定义
export function teamSubRelations(eb: ExpressionBuilder<DB, "team">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("member")
        .whereRef("member.teamId", "=", id)
        .selectAll("member")
        .select((subEb) => memberSubRelations(subEb, subEb.ref("member.id"))),
    ).as("members"),
  ];
}

// 3. 基础 CRUD 方法
export async function findTeamById(id: string): Promise<Team | null> {
  const db = await getDB();
  return await db
    .selectFrom("team")
    .where("id", "=", id)
    .selectAll("team")
    .executeTakeFirst() || null;
}

export async function findTeams(): Promise<Team[]> {
  const db = await getDB();
  return await db
    .selectFrom("team")
    .selectAll("team")
    .execute();
}

export async function insertTeam(trx: Transaction<DB>, data: TeamInsert): Promise<Team> {
  return await trx
    .insertInto("team")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createTeam(trx: Transaction<DB>, data: TeamInsert): Promise<Team> {
  // 注意：createTeam 内部自己处理事务，所以我们需要在外部事务中直接插入
  const team = await trx
    .insertInto("team")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return team;
}

export async function updateTeam(trx: Transaction<DB>, id: string, data: TeamUpdate): Promise<Team> {
  return await trx
    .updateTable("team")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteTeam(trx: Transaction<DB>, id: string): Promise<Team | null> {
  return await trx
    .deleteFrom("team")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findTeamWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("team")
    .where("id", "=", id)
    .selectAll("team")
    .select((eb) => teamSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
