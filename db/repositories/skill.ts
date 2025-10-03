import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, skill } from "../generated/kysely/kysely";
import { insertStatistic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { skillEffectSubRelations } from "./skillEffect";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v3";
import { skillSchema, statisticSchema } from "../generated/zod";
import { SkillEffectRelationsSchema } from "./skillEffect";

// 1. 类型定义
export type Skill = Selectable<skill>;
export type SkillInsert = Insertable<skill>;
export type SkillUpdate = Updateable<skill>;
// 关联查询类型
export type SkillWithRelations = Awaited<ReturnType<typeof findSkillWithRelations>>;
export const SkillRelationsSchema = z.object({
  ...skillSchema.shape,
  effects: z.array(SkillEffectRelationsSchema),
  statistic: statisticSchema,
});

// 2. 关联查询定义
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

// 3. 基础 CRUD 方法
export async function findSkillById(id: string): Promise<Skill | null> {
  const db = await getDB();
  return await db
    .selectFrom("skill")
    .where("id", "=", id)
    .selectAll("skill")
    .executeTakeFirst() || null;
}

export async function findSkills(): Promise<Skill[]> {
  const db = await getDB();
  return await db
    .selectFrom("skill")
    .selectAll("skill")
    .execute();
}

export async function insertSkill(trx: Transaction<DB>, data: SkillInsert): Promise<Skill> {
  const statistic = await insertStatistic(trx);
  const skill = await trx
    .insertInto("skill")
    .values({
      ...data,
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return skill;
}

export async function createSkill(trx: Transaction<DB>, data: SkillInsert): Promise<Skill> {
  // 注意：createSkill 内部自己处理事务，所以我们需要在外部事务中直接插入
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
      ...data,
      id: data.id || createId(),
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return skill;
}

export async function updateSkill(trx: Transaction<DB>, id: string, data: SkillUpdate): Promise<Skill> {
  return await trx
    .updateTable("skill")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSkill(trx: Transaction<DB>, id: string): Promise<Skill | null> {
  return await trx
    .deleteFrom("skill")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findSkillWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("skill")
    .where("id", "=", id)
    .selectAll("skill")
    .select((eb) => skillSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findSkillsLike(searchString: string): Promise<Skill[]> {
  const db = await getDB();
  return await db
    .selectFrom("skill")
    .where("name", "like", `%${searchString}%`)
    .selectAll("skill")
    .execute();
}
