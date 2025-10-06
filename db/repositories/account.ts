import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable, Selectable } from "kysely";
import { getDB } from "./database";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { account, DB } from "../generated/kysely/kysely";
import { createId } from "@paralleldrive/cuid2";
import { accountSchema, account_create_dataSchema, account_update_dataSchema } from "../generated/zod/index";
import { z } from "zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Account = Selectable<account>;
export type AccountInsert = Insertable<account>;
export type AccountUpdate = Updateable<account>;

// 子关系定义
const accountSubRelationDefs = defineRelations({
  create: {
    build: (eb, accountId) =>
      jsonObjectFrom(
        eb
          .selectFrom("account_create_data")
          .where("account_create_data.accountId", "=", accountId)
          .selectAll("account_create_data")
      ).$notNull().as("create"),
    schema: account_create_dataSchema.describe("账户创建数据"),
  },
  update: {
    build: (eb, accountId) =>
      jsonObjectFrom(
        eb
          .selectFrom("account_update_data")
          .where("account_update_data.accountId", "=", accountId)
          .selectAll("account_update_data")
      ).$notNull().as("update"),
    schema: account_update_dataSchema.describe("账户更新数据"),
  },
});

// 生成 factory
export const accountRelationsFactory = makeRelations<"account", typeof accountSubRelationDefs>(
  accountSubRelationDefs
);

// 构造关系Schema
export const AccountWithRelationsSchema = z.object({
  ...accountSchema.shape,
  ...accountRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const accountSubRelations = accountRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findAccountById(id: string, trx?: Transaction<DB>): Promise<Account | null> {
  const db = trx || await getDB();
  return await db
    .selectFrom("account")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst() || null;
}

export async function findAccounts(): Promise<Account[]> {
  const db = await getDB();
  return await db
    .selectFrom("account")
    .selectAll()
    .execute();
}

export async function insertAccount(trx: Transaction<DB>, data: AccountInsert): Promise<Account> {
  return await trx
    .insertInto("account")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createAccount(trx: Transaction<DB>, data: AccountInsert): Promise<Account> {
  const account = await trx
    .insertInto("account")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  // 创建关联的账户数据
  await trx
    .insertInto("account_create_data")
    .values({ accountId: account.id })
    .returningAll()
    .executeTakeFirstOrThrow();
  await trx
    .insertInto("account_update_data")
    .values({ accountId: account.id })
    .returningAll()
    .executeTakeFirstOrThrow();

  return account;
}

export async function updateAccount(trx: Transaction<DB>, id: string, data: AccountUpdate): Promise<Account> {
  return await trx
    .updateTable("account")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteAccount(trx: Transaction<DB>, id: string): Promise<Account | null> {
  return await trx
    .deleteFrom("account")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findAccountWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("account")
    .where("id", "=", id)
    .selectAll("account")
    .select((eb) => accountSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type AccountWithRelations = Awaited<ReturnType<typeof findAccountWithRelations>>;