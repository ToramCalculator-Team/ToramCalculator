import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, simulator } from "~/../db/clientDB/generated/kysely/kyesely";
import { defaultStatistics, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultTeam, teamSubRelations } from "./team";
import { defaultAccount } from "./account";

export type Simulator = Awaited<ReturnType<typeof findSimulatorById>>;
export type NewSimulator = Insertable<simulator>;
export type SimulatorUpdate = Updateable<simulator>;

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
  id: "defaultSimulatorId",

  name: "默认模拟器",
  visibilityType: "Public",
  team: [defaultTeam],
  details: "",

  statistic: defaultStatistics.Simulator,
  statisticId: defaultStatistics.Simulator.id,
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
};
