import { DB, address } from "@db/generated/zod/index";
import { getDB } from "./database";
import { createId } from "@paralleldrive/cuid2";
import { store } from "~/store";
import { createStatistic } from "./statistic";
import { Transaction, Selectable, Insertable, Updateable, Expression, ExpressionBuilder } from "kysely";
import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";
import { AddressSchema, WorldSchema, StatisticSchema, ZoneSchema } from "../generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Address = Selectable<address>;
export type AddressInsert = Insertable<address>;
export type AddressUpdate = Updateable<address>;

// 子关系定义
const addressSubRelationDefs = defineRelations({
  statistic: {
    build: (eb, id) =>
      jsonObjectFrom(
        eb.selectFrom("statistic")
          .where("statistic.id", "=", eb.ref("address.statisticId"))
          .selectAll("statistic")
      ).$notNull().as("statistic"),
    schema: StatisticSchema.describe("统计信息"),
  },
  zones: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb.selectFrom("zone")
          .where("zone.addressId", "=", id)
          .selectAll("zone")
      ).as("zones"),
    schema: z.array(ZoneSchema).describe("所属区域列表"),
  },
});

// 生成 factory
export const addressRelationsFactory = makeRelations(
  addressSubRelationDefs
);

// 构造关系Schema
export const AddressWithRelationsSchema = z.object({
  ...AddressSchema.shape,
  ...addressRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const addressSubRelations = addressRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findAddressById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("address")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst() || null;
}

export async function findAddresses(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("address")
    .selectAll()
    .execute();
}

export async function insertAddress(trx: Transaction<DB>, data: AddressInsert) {
  return await trx
    .insertInto("address")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}


// 特殊查询方法
export async function findAddressWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("address")
    .where("id", "=", id)
    .selectAll("address")
    .select((eb) => addressSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type AddressWithRelations = Awaited<ReturnType<typeof findAddressWithRelations>>;

// 5. 业务逻辑 CRUD 方法
export async function createAddress(trx: Transaction<DB>, addressData: AddressInsert) {
  const statistic = await createStatistic(trx);
  return await trx
    .insertInto("address")
    .values({
      ...addressData,
      id: createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.account?.id,
      updatedByAccountId: store.session.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateAddress(trx: Transaction<DB>, addressData: AddressUpdate) {
  return await trx
    .updateTable("address")
    .set({
      ...addressData,
      updatedByAccountId: store.session.account?.id,
    })
    .where("id", "=", addressData.id!)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteAddress(trx: Transaction<DB>, addressData: Address) {
  // 将相关zones归属调整至defaultAddress
  await trx.updateTable("zone").set({ addressId: "defaultAddressId" }).where("addressId", "=", addressData.id).execute();
  // 删除地址
  await trx.deleteFrom("address").where("id", "=", addressData.id).executeTakeFirstOrThrow();
  // 删除统计
  await trx.deleteFrom("statistic").where("id", "=", addressData.statisticId).executeTakeFirstOrThrow();
}

export async function findAddressesWithRelations(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("address")
    .selectAll("address")
    .select((eb) => addressSubRelations(eb, eb.ref("address.id")))
    .execute();
}
