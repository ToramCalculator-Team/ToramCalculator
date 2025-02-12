import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, team } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

export type Team = Awaited<ReturnType<typeof findTeamById>>;
export type NewTeam = Insertable<team>;
export type TeamUpdate = Updateable<team>;

export function teamSubRelations(eb: ExpressionBuilder<DB, "team">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_memberToteam")
        .innerJoin("member", "_memberToteam.A", "member.id")
        .where("_memberToteam.B", "=", id)
        .select(["member.playerId", "member.mercenaryId", "member.mobId", "member.mobDifficultyFlag"]),
    ).as("members"),
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

export async function updateTeam(id: string, updateWith: TeamUpdate) {
  return await db.updateTable("team").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createTeam(newTeam: NewTeam) {
  return await db.transaction().execute(async (trx) => {
    const team = await trx.insertInto("team").values(newTeam).returningAll().executeTakeFirstOrThrow();
    return team;
  });
}

export async function deleteTeam(id: string) {
  return await db.deleteFrom("team").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultTeam: Team = {
  id: "defaultTeamId",
  name: null,
  gems: [],
  members: [],
  order: 0
};
