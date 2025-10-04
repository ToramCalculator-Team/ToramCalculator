import { Transaction, Selectable, Insertable, Updateable, Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, image } from "../generated/kysely/kysely";
import { createId } from "@paralleldrive/cuid2";
import { imageSchema } from "../generated/zod/index";
import { z } from "zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Image = Selectable<image>;
export type ImageInsert = Insertable<image>;
export type ImageUpdate = Updateable<image>;

// 子关系定义
const imageSubRelationDefs = defineRelations({});

// 生成 factory
export const imageRelationsFactory = makeRelations<"image", typeof imageSubRelationDefs>(
  imageSubRelationDefs
);

// 构造关系Schema
export const ImageWithRelationsSchema = z.object({
  ...imageSchema.shape,
  ...imageRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const imageSubRelations = imageRelationsFactory.subRelations;

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

// 特殊查询方法
export async function findImageWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("image")
    .where("id", "=", id)
    .selectAll("image")
    .select((eb) => imageSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type ImageWithRelations = Awaited<ReturnType<typeof findImageWithRelations>>;
