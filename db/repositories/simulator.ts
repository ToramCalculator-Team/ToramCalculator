import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, simulator } from "../generated/kysely/kysely";
import { statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { TeamRelationsSchema, teamSubRelations } from "./team";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v3";
import { simulatorSchema, statisticSchema, teamSchema } from "@db/generated/zod";

// 1. 类型定义
export type Simulator = Selectable<simulator>;
export type SimulatorInsert = Insertable<simulator>;
export type SimulatorUpdate = Updateable<simulator>;
// 关联查询类型
export type SimulatorWithRelations = Awaited<ReturnType<typeof findSimulatorWithRelations>>;
export const SimulatorRelationsSchema = z.object({
  ...simulatorSchema.shape,
  statistic: statisticSchema,
  campA: z.array(TeamRelationsSchema),
  campB: z.array(TeamRelationsSchema),
});

// 2. 关联查询定义
export function simulatorSubRelations(eb: ExpressionBuilder<DB, "simulator">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .whereRef("id", "=", "simulator.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistic"),
    jsonArrayFrom(
      eb
        .selectFrom("_campA")
        .innerJoin("team", "_campA.B", "team.id")
        .whereRef("_campA.A", "=", id)
        .selectAll("team")
        .select((subEb) => teamSubRelations(subEb, subEb.ref("team.id"))),
    )
      .as("campA"),
    jsonArrayFrom(
      eb
        .selectFrom("_campB")
        .innerJoin("team", "_campB.B", "team.id")
        .whereRef("_campB.A", "=", id)
        .selectAll("team")
        .select((subEb) => teamSubRelations(subEb, subEb.ref("team.id"))),
    )
      .as("campB"),
  ];
}

// 3. 基础 CRUD 方法
export async function findSimulatorById(id: string): Promise<Simulator | null> {
  const db = await getDB();
  return await db
    .selectFrom("simulator")
    .where("id", "=", id)
    .selectAll("simulator")
    .executeTakeFirst() || null;
}

export async function findSimulators(): Promise<Simulator[]> {
  const db = await getDB();
  return await db
    .selectFrom("simulator")
    .selectAll("simulator")
    .execute();
}

export async function insertSimulator(trx: Transaction<DB>, data: SimulatorInsert): Promise<Simulator> {
  return await trx
    .insertInto("simulator")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createSimulator(trx: Transaction<DB>, data: SimulatorInsert): Promise<Simulator> {
  // 注意：createSimulator 内部自己处理事务，所以我们需要在外部事务中直接插入
  const simulator = await trx
    .insertInto("simulator")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return simulator;
}

export async function updateSimulator(trx: Transaction<DB>, id: string, data: SimulatorUpdate): Promise<Simulator> {
  return await trx
    .updateTable("simulator")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSimulator(trx: Transaction<DB>, id: string): Promise<Simulator | null> {
  return await trx
    .deleteFrom("simulator")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findSimulatorWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("simulator")
    .where("id", "=", id)
    .selectAll("simulator")
    .select((eb) => simulatorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}