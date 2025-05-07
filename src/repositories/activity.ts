import { getDB } from "./database";
import { activity } from "~/../db/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";
import { DataType } from "./untils";

export interface Activity extends DataType<activity> {
  MainTable: Awaited<ReturnType<typeof findActivities>>[number];
}

export const defaultActivity: activity = {
  id: "",
  name: "",
};

export const findActivities = async () => {
  const db = await getDB();
  return await db.selectFrom("activity").selectAll().execute();
};

export const findActivityById = async (id: string) => {
  const db = await getDB();
  const activity = await db.selectFrom("activity").where("id", "=", id).selectAll().executeTakeFirst();
  if (!activity) {
    throw new Error(`Activity with id ${id} not found`);
  }
  return activity;
};

export const createActivity = async (trx: any, data: Omit<Activity, "id">) => {
  return await trx
    .insertInto("activity")
    .values({
      ...data,
      id: createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
};
