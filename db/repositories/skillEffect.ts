import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, skill_effect } from "../generated/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type SkillEffect = Selectable<skill_effect>;
export type SkillEffectInsert = Insertable<skill_effect>;
export type SkillEffectUpdate = Updateable<skill_effect>;
// 关联查询类型
export type SkillEffectWithRelations = Awaited<ReturnType<typeof findSkillEffectWithRelations>>;

// 2. 关联查询定义
export function skillEffectSubRelations(eb: ExpressionBuilder<DB, "skill_effect">, id: Expression<string>) {
  return [];
}

// 3. 基础 CRUD 方法
export async function findSkillEffectById(id: string): Promise<SkillEffect | null> {
  const db = await getDB();
  return await db
    .selectFrom("skill_effect")
    .where("id", "=", id)
    .selectAll("skill_effect")
    .executeTakeFirst() || null;
}

export async function findSkillEffects(): Promise<SkillEffect[]> {
  const db = await getDB();
  return await db
    .selectFrom("skill_effect")
    .selectAll("skill_effect")
    .execute();
}

export async function insertSkillEffect(trx: Transaction<DB>, data: SkillEffectInsert): Promise<SkillEffect> {
  return await trx
    .insertInto("skill_effect")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createSkillEffect(trx: Transaction<DB>, data: SkillEffectInsert): Promise<SkillEffect> {
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

export async function updateSkillEffect(trx: Transaction<DB>, id: string, data: SkillEffectUpdate): Promise<SkillEffect> {
  return await trx
    .updateTable("skill_effect")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSkillEffect(trx: Transaction<DB>, id: string): Promise<SkillEffect | null> {
  return await trx
    .deleteFrom("skill_effect")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findSkillEffectWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("skill_effect")
    .where("id", "=", id)
    .selectAll("skill_effect")
    .select((eb) => skillEffectSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
