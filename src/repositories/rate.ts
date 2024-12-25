import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { rate } from "~/repositories/db/types";
import { defaultAccount } from "./account";

export type Rate = Selectable<rate>;
export type NewRate = Insertable<rate>;
export type RateUpdate = Updateable<rate>;

export async function findRatesById(id: string) {
  return await db.selectFrom("rate").where("id", "=", id).selectAll().execute();
}

export async function updateRate(id: string, updateWith: RateUpdate) {
  await db.updateTable("rate").set(updateWith).where("id", "=", id).execute();
}

export async function createRate(rate: NewRate) {
  return await db.insertInto("rate").values(rate).returningAll().executeTakeFirstOrThrow();
}

export async function deleteRate(id: string) {
  return await db.deleteFrom("rate").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultRate: Rate = {
  rate: 0,
  id: "defaultRateId",
  accountId: defaultAccount.id,
  statisticId: "",
};
