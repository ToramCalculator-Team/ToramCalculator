import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, avatar } from "@db/generated/zod/index";
import { createId } from "@paralleldrive/cuid2";
import { AvatarSchema } from "../generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Avatar = Selectable<avatar>;
export type AvatarInsert = Insertable<avatar>;
export type AvatarUpdate = Updateable<avatar>;

// 子关系定义
const avatarSubRelationDefs = defineRelations({});

// 生成 factory
export const avatarRelationsFactory = makeRelations(
  avatarSubRelationDefs
);

// 构造关系Schema
export const AvatarWithRelationsSchema = z.object({
  ...AvatarSchema.shape,
  ...avatarRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const avatarSubRelations = avatarRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findAvatarById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("avatar")
    .where("id", "=", id)
    .selectAll("avatar")
    .executeTakeFirst() || null;
}

export async function findAvatars(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("avatar")
    .selectAll("avatar")
    .execute();
}

export async function insertAvatar(trx: Transaction<DB>, data: AvatarInsert) {
  return await trx
    .insertInto("avatar")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createAvatar(trx: Transaction<DB>, data: AvatarInsert) {
  return await trx
    .insertInto("avatar")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateAvatar(trx: Transaction<DB>, id: string, data: AvatarUpdate) {
  return await trx
    .updateTable("avatar")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteAvatar(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("avatar")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findAvatarWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("avatar")
    .where("id", "=", id)
    .selectAll("avatar")
    .select((eb) => avatarSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type AvatarWithRelations = Awaited<ReturnType<typeof findAvatarWithRelations>>;
