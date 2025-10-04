import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, skill } from "../generated/kysely/kysely";
import { insertStatistic } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import { skillSchema, statisticSchema, skill_effectSchema } from "../generated/zod/index";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Skill = Selectable<skill>;
export type SkillInsert = Insertable<skill>;
export type SkillUpdate = Updateable<skill>;

// 子关系定义
const skillSubRelationDefs = defineRelations({
  statistic: {
    build: (eb, id) =>
      jsonObjectFrom(
        eb
          .selectFrom("statistic")
          .whereRef("id", "=", "skill.statisticId")
          .selectAll("statistic")
      ).$notNull().as("statistic"),
    schema: statisticSchema.describe("统计信息"),
  },
  effects: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("skill_effect")
          .whereRef("skill_effect.belongToskillId", "=", "skill.id")
          .selectAll("skill_effect")
      ).as("effects"),
      schema: z.array(skill_effectSchema).describe("技能效果列表"),
  },
});

// 生成 factory
export const skillRelationsFactory = makeRelations<"skill", typeof skillSubRelationDefs>(
  skillSubRelationDefs
);

// 构造关系Schema
export const SkillWithRelationsSchema = z.object({
  ...skillSchema.shape,
  ...skillRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const skillSubRelations = skillRelationsFactory.subRelations;

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

// 特殊查询方法
export async function findSkillWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("skill")
    .where("id", "=", id)
    .selectAll("skill")
    .select((eb) => skillSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type SkillWithRelations = Awaited<ReturnType<typeof findSkillWithRelations>>;

export async function findSkillsLike(searchString: string): Promise<Skill[]> {
  const db = await getDB();
  return await db
    .selectFrom("skill")
    .where("name", "like", `%${searchString}%`)
    .selectAll("skill")
    .execute();
}
