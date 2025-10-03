import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, mob } from "../generated/kysely/kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { drop_itemSchema, itemSchema, mobSchema, statisticSchema, zoneSchema } from "../generated/zod/index";
import { z, ZodRawShape, ZodTypeAny } from "zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Mob = Selectable<mob>;
export type MobInsert = Insertable<mob>;
export type MobUpdate = Updateable<mob>;

// 3. 基础 CRUD 方法
export async function findMobById(id: string): Promise<Mob | null> {
  const db = await getDB();
  return (await db.selectFrom("mob").where("id", "=", id).selectAll("mob").executeTakeFirst()) || null;
}

export async function findMobs(): Promise<Mob[]> {
  const db = await getDB();
  return await db.selectFrom("mob").selectAll("mob").execute();
}

export async function findMobsLike(searchString: string): Promise<Mob[]> {
  const db = await getDB();
  return await db.selectFrom("mob").where("name", "like", `%${searchString}%`).selectAll("mob").execute();
}

export async function insertMob(trx: Transaction<DB>, data: MobInsert): Promise<Mob> {
  return await trx.insertInto("mob").values(data).returningAll().executeTakeFirstOrThrow();
}

export async function createMob(trx: Transaction<DB>, data: MobInsert): Promise<Mob> {
  // 1. 创建 statistic 记录
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

  // 2. 创建 mob 记录（复用 insertMob）
  const mob = await insertMob(trx, {
    ...data,
    id: data.id || createId(),
    statisticId: statistic.id,
  });

  return mob;
}

export async function updateMob(trx: Transaction<DB>, id: string, data: MobUpdate): Promise<Mob> {
  return await trx.updateTable("mob").set(data).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
}

export async function deleteMob(trx: Transaction<DB>, id: string): Promise<Mob | null> {
  return (await trx.deleteFrom("mob").where("id", "=", id).returningAll().executeTakeFirst()) || null;
}

// 子关系定义
const mobSubRelationDefs = defineRelations({
  belongToZones: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb.selectFrom("_mobTozone")
          .innerJoin("zone", "_mobTozone.B", "zone.id")
          .where("_mobTozone.A", "=", id)
          .selectAll("zone")
      ).as("belongToZones"),
    schema: z.array(zoneSchema).describe("所属区域名称列表"),
  },
  dropItems: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb.selectFrom("drop_item")
          .innerJoin("item", "item.id", "drop_item.itemId")
          .where("drop_item.dropById", "=", id)
          .selectAll("item")
      ).as("dropItems"),
    schema: z.array(itemSchema).describe("掉落物品列表"),
  },
  statistic: {
    build: (eb, id) =>{
      return jsonObjectFrom(
        eb.selectFrom("statistic")
          .whereRef("id", "=", "mob.statisticId")
          .selectAll("statistic")
      ).$notNull().as("statistic")},
    schema: statisticSchema.describe("对应的属性对象"),
  },
})

// 生成 factory
export const mobRelationsFactory = makeRelations<"mob", typeof mobSubRelationDefs>(
  mobSubRelationDefs
);

// 构造关系Schema
export const MobWithRelationsSchema = z.object({
  ...mobSchema.shape,
  ...mobRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const mobSubRelations = mobRelationsFactory.subRelations;

// 特殊查询方法
export async function findMobWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("mob")
    .where("id", "=", id)
    .selectAll("mob")
    .select((eb) => mobSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type MobWithRelations = Awaited<ReturnType<typeof findMobWithRelations>>;
