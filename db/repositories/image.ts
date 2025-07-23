import { Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, image } from "../generated/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type Image = Selectable<image>;
export type ImageInsert = Insertable<image>;
export type ImageUpdate = Updateable<image>;

// 2. 基础 CRUD 方法
export async function findImageById(id: string): Promise<Image | null> {
  const db = await getDB();
  return await db
    .selectFrom("image")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst() || null;
}

export async function findImages(): Promise<Image[]> {
  const db = await getDB();
  return await db
    .selectFrom("image")
    .selectAll()
    .execute();
}

export async function insertImage(trx: Transaction<DB>, data: ImageInsert): Promise<Image> {
  return await trx
    .insertInto("image")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createImage(trx: Transaction<DB>, data: ImageInsert): Promise<Image> {
  return await trx
    .insertInto("image")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateImage(trx: Transaction<DB>, id: string, data: ImageUpdate): Promise<Image> {
  return await trx
    .updateTable("image")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteImage(trx: Transaction<DB>, id: string): Promise<Image | null> {
  return await trx
    .deleteFrom("image")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}
