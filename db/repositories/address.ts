import { DB, address } from "../generated/kysely/kysely";
import { getDB } from "./database";
import { createId } from "@paralleldrive/cuid2";
import { Transaction, Selectable, Insertable, Updateable, Expression, ExpressionBuilder } from "kysely";
import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";
import { addressSchema, worldSchema, statisticSchema, zoneSchema } from "../generated/zod/index";
import { z } from "zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Address = Selectable<address>;
export type AddressInsert = Insertable<address>;
export type AddressUpdate = Updateable<address>;

// 子关系定义
const addressSubRelationDefs = defineRelations({
  world: {
    build: (eb, id) =>
      jsonObjectFrom(
        eb.selectFrom("world")
          .where("world.id", "=", eb.ref("address.worldId"))
          .selectAll("world")
      ).as("world"),
    schema: worldSchema.describe("所属世界"),
  },
  statistic: {
    build: (eb, id) =>
      jsonObjectFrom(
        eb.selectFrom("statistic")
          .where("statistic.id", "=", eb.ref("address.statisticId"))
          .selectAll("statistic")
      ).as("statistic"),
    schema: statisticSchema.describe("统计信息"),
  },
  zones: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb.selectFrom("zone")
          .where("zone.addressId", "=", id)
          .selectAll("zone")
      ).as("zones"),
    schema: z.array(zoneSchema).describe("所属区域列表"),
  },
});

// 生成 factory
export const addressRelationsFactory = makeRelations<"address", typeof addressSubRelationDefs>(
  addressSubRelationDefs
);

// 构造关系Schema
export const AddressWithRelationsSchema = z.object({
  ...addressSchema.shape,
  ...addressRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const addressSubRelations = addressRelationsFactory.subRelations;

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

// 特殊查询方法
export async function findAddressWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("address")
    .where("id", "=", id)
    .selectAll("address")
    .select((eb) => addressSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type AddressWithRelations = Awaited<ReturnType<typeof findAddressWithRelations>>;
