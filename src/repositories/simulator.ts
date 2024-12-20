import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, simulator } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultMob, MobSubRelations } from "./mob";
import { createMember, defaultMember, deleteMember, Member, memberSubRelations } from "./member";

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
        .selectFrom("_simulatorTomember")
        .innerJoin("member", "_simulatorTomember.B", "member.id")
        .whereRef("_simulatorTomember.A", "=", id)
        .selectAll("member")
        .select((subEb) => memberSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("team"),
    jsonArrayFrom(
      eb
        .selectFrom("_simulatorTomob")
        .innerJoin("mob", "_simulatorTomob.B", "mob.id")
        .whereRef("_simulatorTomob.A", "=", id)
        .selectAll("mob")
        .select((subEb) => MobSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("mobs"),
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
    const statistics = await trx
      .insertInto("statistics")
      .values(defaultStatistics)
      .returningAll()
      .executeTakeFirstOrThrow();
    return { ...simulator, statistics };
  });
}

export async function deleteSimulator(id: string) {
  return await db.deleteFrom("simulator").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function addMemberToSimulator(simulatorId: string, member: Member) {
  const m = await createMember(member);
  return await db
    .insertInto("_simulatorTomember")
    .values({ A: simulatorId, B: m.id })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteMemberFromSimulator(simulatorId: string, memberId: string) {
  await db
    .deleteFrom("_simulatorTomember")
    .where("A", "=", simulatorId)
    .where("B", "=", memberId)
    .returningAll()
    .executeTakeFirst();
  await deleteMember(memberId);
}

export const defaultSimulator: Simulator = {
  id: "defaultSimulator",

  name: "defaultSimulator",
  mobs: [defaultMob],
  team: [defaultMember],
  extraDetails: "defaultExtraDetails",

  updatedAt: new Date(),
  updatedByAccountId: "",
  createdAt: new Date(),
  createdByAccountId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};
