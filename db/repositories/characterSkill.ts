import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, character_skill } from "../generated/kysely/kysely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { skillSubRelations, SkillWithRelationsSchema } from "./skill";
import { z } from "zod/v4";
import { character_skillSchema, skillSchema, statisticSchema, skill_effectSchema } from "../generated/zod/index";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type CharacterSkill = Selectable<character_skill>;
export type CharacterSkillInsert = Insertable<character_skill>;
export type CharacterSkillUpdate = Updateable<character_skill>;

// 子关系定义
const characterSkillSubRelationDefs = defineRelations({
  template: {
    build: (eb, id) =>
      jsonObjectFrom(
        eb
          .selectFrom("skill")
          .whereRef("skill.id", "=", "character_skill.templateId")
          .select((subEb) => skillSubRelations(subEb, subEb.val(id)))
          .selectAll("skill")
      ).$notNull().as("template"),
    schema: SkillWithRelationsSchema.describe("技能模板"),
  },
});

// 生成 factory
export const characterSkillRelationsFactory = makeRelations(
  characterSkillSubRelationDefs
);

// 构造关系Schema
export const CharacterSkillWithRelationsSchema = z.object({
  ...character_skillSchema.shape,
  ...characterSkillRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const characterSkillSubRelations = characterSkillRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findCharacterSkillById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("character_skill")
    .where("id", "=", id)
    .selectAll("character_skill")
    .executeTakeFirst() || null;
}

export async function findCharacterSkills(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("character_skill")
    .selectAll("character_skill")
    .execute();
}

export async function insertCharacterSkill(trx: Transaction<DB>, data: CharacterSkillInsert) {
  return await trx
    .insertInto("character_skill")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createCharacterSkill(trx: Transaction<DB>, data: CharacterSkillInsert) {
  return await trx
    .insertInto("character_skill")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateCharacterSkill(trx: Transaction<DB>, id: string, data: CharacterSkillUpdate) {
  return await trx
    .updateTable("character_skill")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteCharacterSkill(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("character_skill")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findCharacterSkillWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("character_skill")
    .where("id", "=", id)
    .selectAll("character_skill")
    .select((eb) => characterSkillSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type CharacterSkillWithRelations = Awaited<ReturnType<typeof findCharacterSkillWithRelations>>;