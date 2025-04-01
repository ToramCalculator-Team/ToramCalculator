import { Expression, ExpressionBuilder } from "kysely";
import { db } from "./database";
import { DB, team } from "~/../db/clientDB/kysely/kyesely";
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
  return await db
    .selectFrom("team")
    .where("id", "=", id)
    .selectAll("team")
    .select((eb) => teamSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findTeams() {
  return await db
    .selectFrom("team")
    .selectAll("team")
    .select((eb) => teamSubRelations(eb, eb.val("team.id")))
    .execute();
}

export async function updateTeam(id: string, updateWith: Team["Update"]) {
  return await db.updateTable("team").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createTeam(newTeam: Team["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const team = await trx.insertInto("team").values(newTeam).returningAll().executeTakeFirstOrThrow();
    return team;
  });
}

export async function deleteTeam(id: string) {
  return await db.deleteFrom("team").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultTeam: Team["Select"] = {
  id: "",
  name: null,
  gems: [],
};
