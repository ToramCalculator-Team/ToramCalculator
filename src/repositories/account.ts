import { Expression, ExpressionBuilder, Kysely, Transaction } from "kysely";
import { getDB } from "./database";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import {DataType } from "./untils";
import { account, DB } from "../../db/generated/kysely/kyesely";

export interface Account extends DataType<account> {
  MainTable: Awaited<ReturnType<typeof findAccounts>>[number];
}

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

export const selectAccount = async (id: string): Promise<Account["Select"]> => {
  const db = await getDB();
  const account = await db.selectFrom("account").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
  return account;
};

export async function findAccountById(id: string) {
  const db = await getDB();
  const account = await db
    .selectFrom("account")
    .where("id", "=", id)
    .selectAll()
    .select((eb) => accountSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
  return account;
}

export async function findAccounts() {
  const db = await getDB();
  const accounts = await db.selectFrom("account").selectAll().execute();
  return accounts;
}

export async function updateAccount(id: string, updateWith: Account["Update"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const account = await trx
      .updateTable("account")
      .set(updateWith)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    return account;
  });
}

export async function insertAccount(trx: Transaction<DB>, account: Account["Insert"]) {
  return await trx.insertInto("account").values(account).returningAll().executeTakeFirstOrThrow();
}

export async function createAccount(trx: Transaction<DB>, newAccount: Account["Insert"]) {
  const account = await insertAccount(trx, newAccount);
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

export async function deleteAccount(id: string) {
  const db = await getDB();
  return await db.deleteFrom("account").where("id", "=", id).returningAll().executeTakeFirst();
}