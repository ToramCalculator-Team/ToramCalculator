import { Expression, ExpressionBuilder } from "kysely";
import { db } from "./database";
import { DB, simulator } from "~/../db/clientDB/kysely/kyesely";
import { statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { teamSubRelations } from "./team";
import { DataType } from "./untils";

export interface Simulator extends DataType<simulator> {
  MainTable: Awaited<ReturnType<typeof findSimulators>>[number];
  MainForm: simulator;
}

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
        .select((subEb) => teamSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("campA"),
    jsonArrayFrom(
      eb
        .selectFrom("_campB")
        .innerJoin("team", "_campB.B", "team.id")
        .whereRef("_campB.A", "=", id)
        .selectAll("team")
        .select((subEb) => teamSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("campB"),
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

export async function updateSimulator(id: string, updateWith: Simulator["Update"]) {
  return await db.updateTable("simulator").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createSimulator(newSimulator: Simulator["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const simulator = await trx.insertInto("simulator").values(newSimulator).returningAll().executeTakeFirstOrThrow();
    return simulator;
  });
}

export async function deleteSimulator(id: string) {
  return await db.deleteFrom("simulator").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultSimulator: Simulator["templateId"] = {
  id: "",

  name: "",
  details: "",

  statisticId: "",
  updatedByAccountId: "",
  createdByAccountId: "",
};
