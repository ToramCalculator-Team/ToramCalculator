import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, zone } from "../generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { mobSubRelations } from "./mob";

// 1. 类型定义
export type Zone = Selectable<zone>;
export type ZoneInsert = Insertable<zone>;
export type ZoneUpdate = Updateable<zone>;
// 关联查询类型
export type ZoneWithRelations = Awaited<ReturnType<typeof findZoneWithRelations>>;

// 2. 关联查询定义
export function zoneSubRelations(eb: ExpressionBuilder<DB, "zone">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_mobTozone")
        .innerJoin("mob", "_mobTozone.A", "mob.id")
        .where("_mobTozone.B", "=", id)
        .select((eb) => mobSubRelations(eb, eb.val("mob.id")))
        .selectAll("mob"),
    ).as("mobs"),
    jsonArrayFrom(
      eb
        .selectFrom("npc")
        .where("npc.zoneId", "=", id)
        .selectAll("npc")
    ).as("npcs"),
  ];
}

// 3. 基础 CRUD 方法
export async function findZoneById(id: string): Promise<Zone | null> {
  const db = await getDB();
  return await db
    .selectFrom("zone")
    .where("id", "=", id)
    .selectAll("zone")
    .executeTakeFirst() || null;
}

export async function findZones(): Promise<Zone[]> {
  const db = await getDB();
  return await db
    .selectFrom("zone")
    .selectAll("zone")
    .execute();
}

export async function insertZone(trx: Transaction<DB>, data: ZoneInsert): Promise<Zone> {
  return await trx
    .insertInto("zone")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createZone(trx: Transaction<DB>, data: ZoneInsert): Promise<Zone> {
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

export async function updateZone(trx: Transaction<DB>, id: string, data: ZoneUpdate): Promise<Zone> {
  return await trx
    .updateTable("zone")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteZone(trx: Transaction<DB>, id: string): Promise<Zone | null> {
  return await trx
    .deleteFrom("zone")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findZoneWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("zone")
    .where("id", "=", id)
    .selectAll("zone")
    .select((eb) => zoneSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findZonesByMobId(mobId: string): Promise<Zone[]> {
  const db = await getDB();
  return await db
    .selectFrom("zone")
    .innerJoin("_mobTozone", "zone.id", "_mobTozone.B")
    .where("_mobTozone.A", "=", mobId)
    .selectAll("zone")
    .execute();
}
