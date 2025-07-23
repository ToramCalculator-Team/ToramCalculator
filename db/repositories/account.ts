import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable, Selectable } from "kysely";
import { getDB } from "./database";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { account, DB } from "../generated/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type Account = Selectable<account>;
export type AccountInsert = Insertable<account>;
export type AccountUpdate = Updateable<account>;
// 关联查询类型
export type AccountWithRelations = Awaited<ReturnType<typeof findAccountWithRelations>>;

// 2. 关联查询定义
export function accountSubRelations(eb: ExpressionBuilder<DB, "account">, accountId: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("account_create_data")
        .where("account_create_data.accountId", "=", accountId)
        .selectAll("account_create_data"),
    )
      .$notNull()
      .as("create"),
    jsonObjectFrom(
      eb
        .selectFrom("account_update_data")
        .where("account_update_data.accountId", "=", accountId)
        .selectAll("account_update_data"),
    )
      .$notNull()
      .as("update"),
  ];
}

// 3. 基础 CRUD 方法
export async function findAccountById(id: string): Promise<Account | null> {
  const db = await getDB();
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

// 4. 特殊查询方法
export async function findAccountWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("account")
    .where("id", "=", id)
    .selectAll("account")
    .select((eb) => accountSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}