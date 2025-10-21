import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, team } from "@db/generated/zod/index";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { MemberWithRelationsSchema, memberSubRelations } from "./member";
import { z } from "zod/v4";
import { teamSchema } from "@db/generated/zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Team = Selectable<team>;
export type TeamInsert = Insertable<team>;
export type TeamUpdate = Updateable<team>;

// 2. 关联查询定义
const teamSubRelationDefs = defineRelations({
  members: {
    build: (eb: ExpressionBuilder<DB, "team">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("member")
          .whereRef("member.belongToTeamId", "=", id)
          .selectAll("member")
          .select((subEb) => memberSubRelations(subEb, subEb.ref("member.id")))
      ).as("members"),
    schema: z.array(MemberWithRelationsSchema).describe("队伍成员"),
  },
});

const teamRelationsFactory = makeRelations(teamSubRelationDefs);
export const TeamWithRelationsSchema = z.object({
  ...teamSchema.shape,
  ...teamRelationsFactory.schema.shape,
});
export const teamSubRelations = teamRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findTeamById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("team")
    .where("id", "=", id)
    .selectAll("team")
    .executeTakeFirst() || null;
}

export async function findTeams(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("team")
    .selectAll("team")
    .execute();
}

export async function insertTeam(trx: Transaction<DB>, data: TeamInsert) {
  return await trx
    .insertInto("team")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createTeam(trx: Transaction<DB>, data: TeamInsert) {
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

export async function updateTeam(trx: Transaction<DB>, id: string, data: TeamUpdate) {
  return await trx
    .updateTable("team")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteTeam(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("team")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findTeamWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("team")
    .where("id", "=", id)
    .selectAll("team")
    .select((eb) => teamSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type TeamWithRelations = Awaited<ReturnType<typeof findTeamWithRelations>>;
