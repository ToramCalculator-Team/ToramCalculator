import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, simulator } from "@db/generated/zod/index";
import { statisticSubRelations, StatisticWithRelationsSchema } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { TeamWithRelationsSchema, teamSubRelations } from "./team";
import { defineRelations, makeRelations } from "./subRelationFactory";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v4";
import { simulatorSchema, statisticSchema, teamSchema } from "@db/generated/zod";

// 1. 类型定义
export type Simulator = Selectable<simulator>;
export type SimulatorInsert = Insertable<simulator>;
export type SimulatorUpdate = Updateable<simulator>;

// 2. 关联查询定义
const simulatorSubRelationDefs = defineRelations({
  statistic: {
    build: (eb: ExpressionBuilder<DB, "simulator">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("statistic")
          .whereRef("id", "=", "simulator.statisticId")
          .selectAll("statistic")
          .select((subEb) => statisticSubRelations(subEb, subEb.val(id)))
      ).$notNull().as("statistic"),
    schema: StatisticWithRelationsSchema.describe("战斗统计"),
  },
  campA: {
    build: (eb: ExpressionBuilder<DB, "simulator">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("_campA")
          .innerJoin("team", "_campA.B", "team.id")
          .whereRef("_campA.A", "=", id)
          .selectAll("team")
          .select((subEb) => teamSubRelations(subEb, subEb.ref("team.id")))
      ).as("campA"),
    schema: z.array(TeamWithRelationsSchema).describe("阵营A队伍"),
  },
  campB: {
    build: (eb: ExpressionBuilder<DB, "simulator">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("_campB")
          .innerJoin("team", "_campB.B", "team.id")
          .whereRef("_campB.A", "=", id)
          .selectAll("team")
          .select((subEb) => teamSubRelations(subEb, subEb.ref("team.id")))
      ).as("campB"),
    schema: z.array(TeamWithRelationsSchema).describe("阵营B队伍"),
  },
});

const simulatorRelationsFactory = makeRelations(simulatorSubRelationDefs);
export const SimulatorWithRelationsSchema = z.object({
  ...simulatorSchema.shape,
  ...simulatorRelationsFactory.schema.shape,
});
export const simulatorSubRelations = simulatorRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findSimulatorById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("simulator")
    .where("id", "=", id)
    .selectAll("simulator")
    .executeTakeFirst() || null;
}

export async function findSimulators(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("simulator")
    .selectAll("simulator")
    .execute();
}

export async function insertSimulator(trx: Transaction<DB>, data: SimulatorInsert) {
  return await trx
    .insertInto("simulator")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createSimulator(trx: Transaction<DB>, data: SimulatorInsert) {
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

export async function updateSimulator(trx: Transaction<DB>, id: string, data: SimulatorUpdate) {
  return await trx
    .updateTable("simulator")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSimulator(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("simulator")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findSimulatorWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("simulator")
    .where("id", "=", id)
    .selectAll("simulator")
    .select((eb) => simulatorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type SimulatorWithRelations = Awaited<ReturnType<typeof findSimulatorWithRelations>>;