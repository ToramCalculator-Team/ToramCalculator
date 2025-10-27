import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, skill_effect } from "@db/generated/zod/index";
import { createId } from "@paralleldrive/cuid2";
import { SkillEffectSchema } from "@db/generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type SkillEffect = Selectable<skill_effect>;
export type SkillEffectInsert = Insertable<skill_effect>;
export type SkillEffectUpdate = Updateable<skill_effect>;

// 子关系定义
const skillEffectSubRelationDefs = defineRelations({});

// 生成 factory
export const skillEffectRelationsFactory = makeRelations(
  skillEffectSubRelationDefs
);

// 构造关系Schema
export const SkillEffectWithRelationsSchema = z.object({
  ...SkillEffectSchema.shape,
  ...skillEffectRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const skillEffectSubRelations = skillEffectRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findSkillEffectById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("skill_effect")
    .where("id", "=", id)
    .selectAll("skill_effect")
    .executeTakeFirst() || null;
}

export async function findSkillEffects(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("skill_effect")
    .selectAll("skill_effect")
    .execute();
}

export async function insertSkillEffect(trx: Transaction<DB>, data: SkillEffectInsert) {
  return await trx
    .insertInto("skill_effect")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createSkillEffect(trx: Transaction<DB>, data: SkillEffectInsert) {
  // 注意：createSkillEffect 内部自己处理事务，所以我们需要在外部事务中直接插入
  const skillEffect = await trx
    .insertInto("skill_effect")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return skillEffect;
}

export async function updateSkillEffect(trx: Transaction<DB>, id: string, data: SkillEffectUpdate) {
  return await trx
    .updateTable("skill_effect")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSkillEffect(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("skill_effect")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findSkillEffectWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("skill_effect")
    .where("id", "=", id)
    .selectAll("skill_effect")
    .select((eb) => skillEffectSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type SkillEffectWithRelations = Awaited<ReturnType<typeof findSkillEffectWithRelations>>;
