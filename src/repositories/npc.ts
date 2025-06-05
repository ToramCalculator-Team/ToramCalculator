import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, npc } from "~/../db/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";

export interface Npc extends DataType<npc> {
  MainTable: Awaited<ReturnType<typeof findNpcs>>[number];
  MainForm: npc;
}

export function npcSubRelations(eb: ExpressionBuilder<DB, "npc">, id: Expression<string>) {
  return [jsonArrayFrom(eb.selectFrom("task").where("task.npcId", "=", id).selectAll("task")).as("tasks")];
}

export async function findNpcById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("npc")
    .where("id", "=", id)
    .selectAll("npc")
    .select((eb) => npcSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findNpcs() {
  const db = await getDB();
  return await db.selectFrom("npc").selectAll("npc").execute();
}

export async function updateNpc(id: string, updateWith: Npc["Update"]) {
  const db = await getDB();
  return await db.updateTable("npc").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteNpc(id: string) {
  const db = await getDB();
  return await db.deleteFrom("npc").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createNpc(trx: Transaction<DB>, data: Npc["Insert"]) {
  return await trx.insertInto("npc").values({
    ...data,
    id: createId(),
  }).returningAll().executeTakeFirstOrThrow();
}