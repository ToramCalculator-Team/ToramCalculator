import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, zone } from "../../db/generated/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";
import { mobSubRelations } from "./mob";
import { createId } from "@paralleldrive/cuid2";

export interface Zone extends DataType<zone> {
  MainTable: Awaited<ReturnType<typeof findZones>>[number];
  MainForm: zone;
}

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
    jsonArrayFrom(eb.selectFrom("npc").where("npc.zoneId", "=", id).selectAll("npc")).as("npcs"),
  ];
}

export async function findZoneById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("zone")
    .where("id", "=", id)
    .selectAll("zone")
    .select((eb) => zoneSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findZonesByMobId(mobId: string) {
  const db = await getDB();
  return await db
    .selectFrom("zone")
    .innerJoin("_mobTozone", "zone.id", "_mobTozone.B")
    .where("_mobTozone.A", "=", mobId)
    .selectAll("zone")
    .execute();
}

export async function findZones() {
  const db = await getDB();
  return await db.selectFrom("zone").selectAll("zone").execute();
}

export async function updateZone(id: string, updateWith: Zone["Update"]) {
  const db = await getDB();
  return await db.updateTable("zone").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteZone(id: string) {
  const db = await getDB();
  return await db.deleteFrom("zone").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createZone(trx: Transaction<DB>, newZone: Zone["Insert"]) {
  return await trx
    .insertInto("zone")
    .values({
      ...newZone,
      id: createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
