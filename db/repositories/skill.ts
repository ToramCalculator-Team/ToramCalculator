import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, skill } from "../generated/kysely/kyesely";
import { insertStatistic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { skillEffectSubRelations } from "./skillEffect";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";

export interface Skill extends DataType<skill> {
  MainTable: Awaited<ReturnType<typeof findSkills>>[number];
  MainForm: skill;
  Card: Awaited<ReturnType<typeof findSkillById>>;
}

export function skillSubRelations(eb: ExpressionBuilder<DB, "skill">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .whereRef("id", "=", "skill.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistic"),
    jsonArrayFrom(
      eb
        .selectFrom("skill_effect")
        .whereRef("skill_effect.belongToskillId", "=", "skill.id")
        .selectAll("skill_effect")
        .select((subEb) => skillEffectSubRelations(subEb, subEb.val(id))),
    ).as("effects"),
  ];
}

export async function findSkillById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("skill")
    .where("id", "=", id)
    .selectAll("skill")
    // .select((eb) => skillSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findSkillsLike(searchString: string) {
  const db = await getDB();
  return await db.selectFrom("skill").where("name", "like", `%${searchString}%`).selectAll("skill").execute();
}

export async function findSkills() {
  const db = await getDB();
  return await db.selectFrom("skill").selectAll("skill").execute();
}

export async function updateSkill(id: string, updateWith: Skill["Update"]) {
  const db = await getDB();
  return await db.updateTable("skill").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertSkill(trx: Transaction<DB>, newSkill: Skill["Insert"]) {
  const statistic = await insertStatistic(trx);
  const skill = await trx
    .insertInto("skill")
    .values({
      ...newSkill,
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return skill;
}

export async function createSkill(trx: Transaction<DB>, newSkill: Skill["Insert"]) {
  const statistic = await trx
    .insertInto("statistic")
    .values({
      id: createId(),
      updatedAt: new Date(),
      createdAt: new Date(),
      usageTimestamps: [],
      viewTimestamps: [],
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  const skill = await trx
    .insertInto("skill")
    .values({
      ...newSkill,
      id: createId(),
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return skill;
}

export async function deleteSkill(id: string) {
  const db = await getDB();
  return await db.deleteFrom("skill").where("id", "=", id).returningAll().executeTakeFirst();
}
