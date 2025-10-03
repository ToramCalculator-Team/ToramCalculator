import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, avatar } from "../generated/kysely/kysely";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type Avatar = Selectable<avatar>;
export type AvatarInsert = Insertable<avatar>;
export type AvatarUpdate = Updateable<avatar>;
// 关联查询类型
export type AvatarWithRelations = Awaited<ReturnType<typeof findAvatarWithRelations>>;

// 2. 关联查询定义
export function avatarSubRelations(eb: ExpressionBuilder<DB, "avatar">, id: Expression<string>) {
  return [];
}

// 3. 基础 CRUD 方法
export async function findAvatarById(id: string): Promise<Avatar | null> {
  const db = await getDB();
  return await db
    .selectFrom("avatar")
    .where("id", "=", id)
    .selectAll("avatar")
    .executeTakeFirst() || null;
}

export async function findAvatars(): Promise<Avatar[]> {
  const db = await getDB();
  return await db
    .selectFrom("avatar")
    .selectAll("avatar")
    .execute();
}

export async function insertAvatar(trx: Transaction<DB>, data: AvatarInsert): Promise<Avatar> {
  return await trx
    .insertInto("avatar")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createAvatar(trx: Transaction<DB>, data: AvatarInsert): Promise<Avatar> {
  return await trx
    .insertInto("avatar")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateAvatar(trx: Transaction<DB>, id: string, data: AvatarUpdate): Promise<Avatar> {
  return await trx
    .updateTable("avatar")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteAvatar(trx: Transaction<DB>, id: string): Promise<Avatar | null> {
  return await trx
    .deleteFrom("avatar")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findAvatarWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("avatar")
    .where("id", "=", id)
    .selectAll("avatar")
    .select((eb) => avatarSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
