import { DB, address } from "../generated/kysely/kyesely";
import { getDB } from "./database";
import { createId } from "@paralleldrive/cuid2";
import { Transaction, Selectable, Insertable, Updateable, Expression, ExpressionBuilder } from "kysely";
import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";

// 1. 类型定义
export type Address = Selectable<address>;
export type AddressInsert = Insertable<address>;
export type AddressUpdate = Updateable<address>;
// 关联查询类型
export type AddressWithRelations = Awaited<ReturnType<typeof findAddressWithRelations>>;

// 2. 关联查询定义
export function addressSubRelations(eb: ExpressionBuilder<DB, "address">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb.selectFrom("world")
        .where("world.id", "=", eb.ref("address.worldId"))
        .selectAll("world")
    ).as("world"),
    jsonObjectFrom(
      eb.selectFrom("statistic")
        .where("statistic.id", "=", eb.ref("address.statisticId"))
        .selectAll("statistic")
    ).as("statistic"),
    jsonArrayFrom(
      eb.selectFrom("zone")
        .where("zone.addressId", "=", id)
        .selectAll("zone")
    ).as("zones"),
  ];
}

// 3. 基础 CRUD 方法
export async function findAddressById(id: string): Promise<Address | null> {
  const db = await getDB();
  return await db
    .selectFrom("address")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst() || null;
}

export async function findAddresses(): Promise<Address[]> {
  const db = await getDB();
  return await db
    .selectFrom("address")
    .selectAll()
    .execute();
}

export async function insertAddress(trx: Transaction<DB>, data: AddressInsert): Promise<Address> {
  return await trx
    .insertInto("address")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createAddress(trx: Transaction<DB>, data: AddressInsert): Promise<Address> {
  return await trx
    .insertInto("address")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateAddress(trx: Transaction<DB>, id: string, data: AddressUpdate): Promise<Address> {
  return await trx
    .updateTable("address")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteAddress(trx: Transaction<DB>, id: string): Promise<Address | null> {
  return await trx
    .deleteFrom("address")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findAddressWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("address")
    .where("id", "=", id)
    .selectAll("address")
    .select((eb) => addressSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
