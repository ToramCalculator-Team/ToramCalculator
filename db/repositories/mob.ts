import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, mob } from "../generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { drop_itemSchema, mobSchema, statisticSchema, zoneSchema } from "../generated/zod/index";
import { z, ZodRawShape } from "zod";

// 1. 类型定义
export type Mob = Selectable<mob>;
export type MobInsert = Insertable<mob>;
export type MobUpdate = Updateable<mob>;
// 关联查询类型
export type MobWithRelations = Awaited<ReturnType<typeof findMobWithRelations>>;

// 1. 定义一个映射表：每一项都包含字段名、builder 函数 和 对应的 Zod schema
const mobSubRelationDefs = {
  belongToZones: {
    builder: (eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("_mobTozone")
          .innerJoin("zone", "_mobTozone.B", "zone.id")
          .where("_mobTozone.A", "=", id)
          .select("zone.name"),
      ).as("belongToZones"),
    schema: z.array(zoneSchema).describe("所属区域名称列表"),
  },
  dropItems: {
    builder: (eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("drop_item")
          .innerJoin("item", "item.id", "drop_item.itemId")
          .where("drop_item.dropById", "=", id)
          .selectAll("item"),
      ).as("dropItems"),
    schema: z.array(drop_itemSchema).describe("掉落物品列表"),
  },
  statistic: {
    builder: (eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) =>
      jsonObjectFrom(eb.selectFrom("statistic").whereRef("id", "=", "mob.statisticId").selectAll("statistic"))
        .$notNull()
        .as("statistic"),
    schema: statisticSchema.describe("对应的属性对象"),
  },
} as const;

// 2. 关联查询定义
export function mobSubRelations(eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) {
  return (Object.values(mobSubRelationDefs) as Array<(typeof mobSubRelationDefs)[keyof typeof mobSubRelationDefs]>).map(
    (def) => def.builder(eb, id),
  );
}

// 3.1 从映射表中抽出所有子字段的 ZodRawShape，此方法生成的zodSchema将无法静态推断
const subRelationZodShape: ZodRawShape = Object.fromEntries(
  Object.entries(mobSubRelationDefs).map(([key, def]) => [key, def.schema]),
);

// 4. 最终把它们合并成完整的 Card schema
export const mobCardSchema = mobSchema.extend(subRelationZodShape);

// 3. 基础 CRUD 方法
export async function findMobById(id: string): Promise<Mob | null> {
  const db = await getDB();
  return await db
    .selectFrom("mob")
    .where("id", "=", id)
    .selectAll("mob")
    .executeTakeFirst() || null;
}

export async function findMobs(): Promise<Mob[]> {
  const db = await getDB();
  return await db
    .selectFrom("mob")
    .selectAll("mob")
    .execute();
}

export async function findMobsLike(searchString: string): Promise<Mob[]> {
  const db = await getDB();
  return await db
    .selectFrom("mob")
    .where("name", "like", `%${searchString}%`)
    .selectAll("mob")
    .execute();
}

export async function insertMob(trx: Transaction<DB>, data: MobInsert): Promise<Mob> {
  return await trx
    .insertInto("mob")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
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
  return await trx
    .updateTable("mob")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteMob(trx: Transaction<DB>, id: string): Promise<Mob | null> {
  return await trx
    .deleteFrom("mob")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findMobWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("mob")
    .where("id", "=", id)
    .selectAll("mob")
    .select((eb) => mobSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
