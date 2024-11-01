import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, analyzer } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultMob, MobSubRelations } from "./mob";
import { createMember, defaultMember, deleteMember, Member, memberSubRelations } from "./member";

export type Analyzer = Awaited<ReturnType<typeof findAnalyzerById>>;
export type NewAnalyzer = Insertable<analyzer>;
export type AnalyzerUpdate = Updateable<analyzer>;

export function analyzerSubRelations(eb: ExpressionBuilder<DB, "analyzer">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "analyzer.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("statistics"),
    jsonArrayFrom(
      eb
        .selectFrom("_analyzerTomember")
        .innerJoin("member", "_analyzerTomember.A", "member.id")
        .whereRef("_analyzerTomember.B", "=", "analyzer.id")
        .selectAll("member")
        .select((subEb) => memberSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("team"),
    jsonArrayFrom(
      eb
        .selectFrom("_analyzerTomob")
        .innerJoin("mob", "_analyzerTomob.A", "mob.id")
        .whereRef("_analyzerTomob.B", "=", "analyzer.id")
        .selectAll("mob")
        .select((subEb) => MobSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("mobs"),
  ];
}

export async function findAnalyzerById(id: string) {
  return await db
    .selectFrom("analyzer")
    .where("id", "=", id)
    .selectAll("analyzer")
    .select((eb) => analyzerSubRelations(eb, eb.val(id)))
    .executeTakeFirst();
}

export async function updateAnalyzer(id: string, updateWith: AnalyzerUpdate) {
  return await db.updateTable("analyzer").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createAnalyzer(newAnalyzer: NewAnalyzer) {
  return await db.transaction().execute(async (trx) => {
    const analyzer = await trx.insertInto("analyzer").values(newAnalyzer).returningAll().executeTakeFirstOrThrow();
    const statistics = await trx
      .insertInto("statistics")
      .values(defaultStatistics)
      .returningAll()
      .executeTakeFirstOrThrow();
    return { ...analyzer, statistics };
  });
}

export async function deleteAnalyzer(id: string) {
  return await db.deleteFrom("analyzer").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function addMemberToAnalyzer(analyzerId: string, member: Member) {
  const m = await createMember(member);
  return await db
    .insertInto("_analyzerTomember")
    .values({ A: analyzerId, B: m.id })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteMemberFromAnalyzer(analyzerId: string, memberId: string) {
  await db.deleteFrom("_analyzerTomember").where("A", "=", analyzerId).where("B", "=", memberId).returningAll().executeTakeFirst();
  await deleteMember(memberId);
}

export const defaultAnalyzer: Analyzer = {
  id: "defaultAnalyzer",

  name: "defaultAnalyzer",
  mobs: [defaultMob],
  team: [defaultMember],
  extraDetails: "defaultExtraDetails",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};
