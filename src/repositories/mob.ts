import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, mob } from "~/../db/kysely/kyesely";
import { statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { getDictionary, Locale } from "~/locales/i18n";
import { ConvertToAllDetail, DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { drop_itemSchema, itemSchema, mobSchema, statisticSchema, zoneSchema } from "../../db/zod";
import { z, ZodRawShape } from "zod";

export interface Mob extends DataType<mob> {
  MainTable: Awaited<ReturnType<typeof findMobs>>[number];
  MainForm: mob;
  Card: Awaited<ReturnType<typeof findMobById>>;
}

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

// 2. 用上面的映射表动态生成 mobSubRelations
export function mobSubRelations(eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) {
  return (Object.values(mobSubRelationDefs) as Array<(typeof mobSubRelationDefs)[keyof typeof mobSubRelationDefs]>).map(
    (def) => def.builder(eb, id),
  );
}

// 3.1 从映射表中抽出所有子字段的 ZodRawShape，此方法生成的zodSchema将无法静态推断
const subRelationZodShape: ZodRawShape = Object.fromEntries(
  Object.entries(mobSubRelationDefs).map(([key, def]) => [key, def.schema])
);

// 3.2 手动构建zodSchema，此办法支持静态推断
// const subRelationZodShape = {
//   belongToZones: z.array(zoneSchema),
//   dropItems: z.array(drop_itemSchema),
//   statistic: statisticSchema
// } as const;

// 4. 最终把它们合并成完整的 Card schema
export const mobCardSchema = mobSchema.extend(subRelationZodShape);

export async function findMobById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("mob")
    .where("id", "=", id)
    .selectAll("mob")
    .select((eb) => mobSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMobsLike(searchString: string) {
  const db = await getDB();
  const results = await db.selectFrom("mob").where("name", "like", `%${searchString}%`).selectAll().execute();
  return results;
}

export async function findMobs() {
  const db = await getDB();
  const result = await db.selectFrom("mob").selectAll("mob").execute();
  return result;
}

export async function updateMob(id: string, updateWith: Mob["Update"]) {
  const db = await getDB();
  return await db.updateTable("mob").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMob(trx: Transaction<DB>, newMob: Mob["Insert"]) {
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
  const mob = await trx
    .insertInto("mob")
    .values({
      ...newMob,
      id: createId(),
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return mob;
}

export async function deleteMob(id: string) {
  const db = await getDB();
  return await db.deleteFrom("mob").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMob: Mob["Select"] = {
  id: "",
  name: "",
  type: "Boss",
  initialElement: "Normal",
  captureable: false,
  actions: [],
  baseLv: 0,
  experience: 0,
  radius: 0,
  maxhp: 0,
  physicalDefense: 0,
  physicalResistance: 0,
  magicalDefense: 0,
  magicalResistance: 0,
  criticalResistance: 0,
  avoidance: 0,
  dodge: 0,
  block: 0,
  normalAttackResistanceModifier: 0,
  physicalAttackResistanceModifier: 0,
  magicalAttackResistanceModifier: 0,
  partsExperience: 0,
  details: "",
  dataSources: "",
  statisticId: "",
  updatedByAccountId: "",
  createdByAccountId: "",
};

// export function mobSubRelations(eb: ExpressionBuilder<DB, "mob">, id: Expression<string>) {
//   return [
//     jsonArrayFrom(
//       eb
//         .selectFrom("_mobTozone")
//         .innerJoin("zone", "_mobTozone.B", "zone.id")
//         .where("_mobTozone.A", "=", id)
//         .select("zone.name"),
//     ).as("belongToZones"),
//     jsonArrayFrom(
//       eb
//         .selectFrom("drop_item")
//         .innerJoin("item", "item.id", "drop_item.itemId")
//         .where("drop_item.dropById", "=", id)
//         .selectAll("item"),
//     ).as("dropItems"),
//     jsonObjectFrom(
//       eb
//         .selectFrom("statistic")
//         .whereRef("id", "=", "mob.statisticId")
//         .selectAll("statistic")
//         .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
//     )
//       .$notNull()
//       .as("statistic"),
//   ];
// }
