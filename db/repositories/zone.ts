import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, zone } from "@db/generated/zod/index";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { mobSubRelations, MobWithRelationsSchema } from "./mob";
import { ZoneSchema } from "@db/generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";
import { npcSubRelations, NpcWithRelationsSchema } from "./npc";

// 1. 类型定义
export type Zone = Selectable<zone>;
export type ZoneInsert = Insertable<zone>;
export type ZoneUpdate = Updateable<zone>;

// 2. 关联查询定义
const zoneSubRelationDefs = defineRelations({
  mobs: {
    build: (eb: ExpressionBuilder<DB, "zone">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("_mobTozone")
          .innerJoin("mob", "_mobTozone.A", "mob.id")
          .where("_mobTozone.B", "=", id)
          .select((eb) => mobSubRelations(eb, eb.val("mob.id")))
          .selectAll("mob")
      ).as("mobs"),
    schema: z.array(MobWithRelationsSchema).describe("区域内怪物"),
  },
  npcs: {
    build: (eb: ExpressionBuilder<DB, "zone">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("npc")
          .where("npc.zoneId", "=", id)
          .select((eb) => npcSubRelations(eb, eb.val("npc.id")))
          .selectAll("npc")
      ).as("npcs"),
    schema: z.array(NpcWithRelationsSchema).describe("区域内NPC"),
  },
});

const zoneRelationsFactory = makeRelations(zoneSubRelationDefs);
export const ZoneWithRelationsSchema = z.object({
  ...ZoneSchema.shape,
  ...zoneRelationsFactory.schema.shape,
});
export const zoneSubRelations = zoneRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findZoneById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("zone")
    .where("id", "=", id)
    .selectAll("zone")
    .executeTakeFirst() || null;
}

export async function findZones(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("zone")
    .selectAll("zone")
    .execute();
}

export async function insertZone(trx: Transaction<DB>, data: ZoneInsert) {
  return await trx
    .insertInto("zone")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createZone(trx: Transaction<DB>, data: ZoneInsert) {
  // 注意：createZone 内部自己处理事务，所以我们需要在外部事务中直接插入
  const zone = await trx
    .insertInto("zone")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return zone;
}

export async function updateZone(trx: Transaction<DB>, id: string, data: ZoneUpdate) {
  return await trx
    .updateTable("zone")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteZone(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("zone")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findZoneWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("zone")
    .where("id", "=", id)
    .selectAll("zone")
    .select((eb) => zoneSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type ZoneWithRelations = Awaited<ReturnType<typeof findZoneWithRelations>>;

export async function findZonesByMobId(mobId: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("zone")
    .innerJoin("_mobTozone", "zone.id", "_mobTozone.B")
    .where("_mobTozone.A", "=", mobId)
    .selectAll("zone")
    .execute();
}
