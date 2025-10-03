import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, character_skill } from "../generated/kysely/kysely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { skillSubRelations } from "./skill";
import { z } from "zod/v3";
import { character_skillSchema } from "../generated/zod";
import { SkillRelationsSchema } from "./skill";

// 1. 类型定义
export type CharacterSkill = Selectable<character_skill>;
export type CharacterSkillInsert = Insertable<character_skill>;
export type CharacterSkillUpdate = Updateable<character_skill>;
// 关联查询类型
export type CharacterSkillWithRelations = Awaited<ReturnType<typeof findCharacterSkillWithRelations>>;
export const CharacterSkillRelationsSchema = z.object({
  ...character_skillSchema.shape,
  template: SkillRelationsSchema.nullable(),
});

// 2. 关联查询定义
export function character_skillSubRelations(eb: ExpressionBuilder<DB, "character_skill">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("skill")
        .whereRef("skill.id", "=", "character_skill.templateId")
        .select((subEb) => skillSubRelations(subEb, subEb.val(id)))
        .selectAll("skill"),
    ).as("template"),
  ];
}

// 3. 基础 CRUD 方法
export async function findCharacterSkillById(id: string): Promise<CharacterSkill | null> {
  const db = await getDB();
  return await db
    .selectFrom("character_skill")
    .where("id", "=", id)
    .selectAll("character_skill")
    .executeTakeFirst() || null;
}

export async function findCharacterSkills(): Promise<CharacterSkill[]> {
  const db = await getDB();
  return await db
    .selectFrom("character_skill")
    .selectAll("character_skill")
    .execute();
}

export async function insertCharacterSkill(trx: Transaction<DB>, data: CharacterSkillInsert): Promise<CharacterSkill> {
  return await trx
    .insertInto("character_skill")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createCharacterSkill(trx: Transaction<DB>, data: CharacterSkillInsert): Promise<CharacterSkill> {
  return await trx
    .insertInto("character_skill")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateCharacterSkill(trx: Transaction<DB>, id: string, data: CharacterSkillUpdate): Promise<CharacterSkill> {
  return await trx
    .updateTable("character_skill")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteCharacterSkill(trx: Transaction<DB>, id: string): Promise<CharacterSkill | null> {
  return await trx
    .deleteFrom("character_skill")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findCharacterSkillWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("character_skill")
    .where("id", "=", id)
    .selectAll("character_skill")
    .select((eb) => character_skillSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}