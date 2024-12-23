import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, simulator } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { teamSubRelations } from "./team";
import { defaultAccount } from "./account";

export type Simulator = Awaited<ReturnType<typeof findSimulatorById>>;
export type NewSimulator = Insertable<simulator>;
export type SimulatorUpdate = Updateable<simulator>;

export function simulatorSubRelations(eb: ExpressionBuilder<DB, "simulator">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "simulator.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistics"),
    jsonArrayFrom(
      eb
        .selectFrom("_simulatorToteam")
        .innerJoin("team", "_simulatorToteam.B", "team.id")
        .whereRef("_simulatorToteam.A", "=", id)
        .selectAll("team")
        .select((subEb) => teamSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("team"),
  ];
}

export async function findSimulatorById(id: string) {
  return await db
    .selectFrom("simulator")
    .where("id", "=", id)
    .selectAll("simulator")
    .select((eb) => simulatorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findSimulators() {
  const res = await db
    .selectFrom("simulator")
    .selectAll("simulator")
    .select((eb) => simulatorSubRelations(eb, eb.val("simulator.id")))
    .execute();
  console.log("findSimulators", res);
  return res;
}

export async function updateSimulator(id: string, updateWith: SimulatorUpdate) {
  return await db.updateTable("simulator").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createSimulator(newSimulator: NewSimulator) {
  return await db.transaction().execute(async (trx) => {
    const simulator = await trx.insertInto("simulator").values(newSimulator).returningAll().executeTakeFirstOrThrow();
    return simulator;
  });
}

export async function deleteSimulator(id: string) {
  return await db.deleteFrom("simulator").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultSimulator: Simulator = {
  id: "defaultSimulator",

  name: "默认模拟器（缺省值）",
  visibility: "Public",
  team: [],
  extraDetails: "",

  updatedAt: new Date(),
  createdAt: new Date(),
  statistics: defaultStatistics,
  statisticsId: defaultStatistics.id,
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
};
