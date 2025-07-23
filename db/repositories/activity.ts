import { getDB } from "./database";
import { activity, DB } from "../generated/kysely/kyesely";
import { Selectable, Insertable, Updateable } from "kysely";
import { createId } from "@paralleldrive/cuid2";
import { Transaction } from "kysely";

// 1. 类型定义
export type Activity = Selectable<activity>;
export type ActivityInsert = Insertable<activity>;
export type ActivityUpdate = Updateable<activity>;

// 2. 基础 CRUD 方法
export async function findActivityById(id: string): Promise<Activity | null> {
  const db = await getDB();
  return await db
    .selectFrom("activity")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst() || null;
}

export async function findActivities(): Promise<Activity[]> {
  const db = await getDB();
  return await db
    .selectFrom("activity")
    .selectAll()
    .execute();
}

export async function insertActivity(trx: Transaction<DB>, data: ActivityInsert): Promise<Activity> {
  return await trx
    .insertInto("activity")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createActivity(trx: Transaction<DB>, data: ActivityInsert): Promise<Activity> {
  return await trx
    .insertInto("activity")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateActivity(trx: Transaction<DB>, id: string, data: ActivityUpdate): Promise<Activity> {
  return await trx
    .updateTable("activity")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteActivity(trx: Transaction<DB>, id: string): Promise<Activity | null> {
  return await trx
    .deleteFrom("activity")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}
