import { DB, address } from "../../db/generated/kysely/kyesely";
import { getDB } from "./database";
import { createId } from "@paralleldrive/cuid2";
import { DataType } from "./untils";
import { Transaction } from "kysely";

export interface Address extends DataType<address> {
  MainTable: address;
  Card: Awaited<ReturnType<typeof findAddressById>>;
}

export async function findAddressById(id: string): Promise<address> {
  const db = await getDB();
  const result = await db.selectFrom("address").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
  return result;
}

export async function findAddresses(): Promise<address[]> {
  const db = await getDB();
  return await db.selectFrom("address").selectAll().execute();
}

export async function updateAddress(id: string, data: Partial<address>): Promise<address> {
  const db = await getDB();
  await db.updateTable("address").set(data).where("id", "=", id).execute();
  return await findAddressById(id);
}

export async function createAddress(trx: Transaction<DB>, data: Omit<address, "id">): Promise<address> {
  const result = await trx
    .insertInto("address")
    .values({ ...data, id: createId() })
    .returningAll()
    .executeTakeFirstOrThrow();
  return result;
}

export async function deleteAddress(id: string): Promise<void> {
  const db = await getDB();
  await db.deleteFrom("address").where("id", "=", id).execute();
}
