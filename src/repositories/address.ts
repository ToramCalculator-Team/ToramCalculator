import { DB, address } from "~/../db/kysely/kyesely";
import { getDB } from "./database";
import { AddressType } from "~/../db/kysely/enums";

export interface Address {
  MainTable: address;
}

export const defaultAddress: address = {
  id: "",
  name: "",
  type: AddressType.Normal,
  posX: 0,
  posY: 0,
  worldId: "",
};

export async function findAddressById(id: string): Promise<address> {
  const db = await getDB();
  const result = await db.selectFrom("address").where("id", "=", id).selectAll().executeTakeFirst();
  return result ?? defaultAddress;
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

export async function createAddress(data: Omit<address, "id">): Promise<address> {
  const db = await getDB();
  const result = await db.insertInto("address").values({ ...data, id: crypto.randomUUID() }).returningAll().executeTakeFirst();
  return result ?? defaultAddress;
}

export async function deleteAddress(id: string): Promise<void> {
  const db = await getDB();
  await db.deleteFrom("address").where("id", "=", id).execute();
} 