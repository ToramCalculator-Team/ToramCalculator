import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, team } from "../../db/generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";

export interface Team extends DataType<team> {
  MainTable: Awaited<ReturnType<typeof findTeams>>[number];
  MainForm: team;
}

export function teamSubRelations(eb: ExpressionBuilder<DB, "team">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_campA")
        .innerJoin("member", "_campA.A", "member.id")
        .whereRef("_campA.B", "=", "team.id")
        .select(["member.playerId", "member.mercenaryId", "member.mobId", "member.mobDifficultyFlag"]),
    ).as("campA"),
    jsonArrayFrom(
      eb
        .selectFrom("_campB")
        .innerJoin("member", "_campB.A", "member.id")
        .whereRef("_campB.B", "=", "team.id")
        .select(["member.playerId", "member.mercenaryId", "member.mobId", "member.mobDifficultyFlag"]),
    ).as("campB"),
  ];
}

export async function findTeamById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("team")
    .where("id", "=", id)
    .selectAll("team")
    .select((eb) => teamSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findTeams() {
  const db = await getDB();
  return await db
    .selectFrom("team")
    .selectAll("team")
    .select((eb) => teamSubRelations(eb, eb.val("team.id")))
    .execute();
}

export async function updateTeam(id: string, updateWith: Team["Update"]) {
  const db = await getDB();
  return await db.updateTable("team").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createTeam(newTeam: Team["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const team = await trx.insertInto("team").values(newTeam).returningAll().executeTakeFirstOrThrow();
    return team;
  });
}

export async function deleteTeam(id: string) {
  const db = await getDB();
  return await db.deleteFrom("team").where("id", "=", id).returningAll().executeTakeFirst();
}
