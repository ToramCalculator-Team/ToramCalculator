import { Expression, ExpressionBuilder, Kysely, Transaction } from "kysely";
import { getDB } from "./database";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";
import { account, DB } from "~/../db/kysely/kyesely";

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

// default
export const defaultAccount: Account["Select"] = {
  id: "",
  type: "User",
  provider: "",
  providerAccountId: "",
  refresh_token: null,
  access_token: null,
  expires_at: null,
  token_type: null,
  scope: null,
  id_token: null,
  session_state: null,
  userId: "",
};

// 设计为Form字段字典，但是由于Table字段是此对象子集，因此通用
export const AccountDic = (locale: Locale): ConvertToAllString<Account["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "账号",
        id: "ID",
        type: "类型",
        provider: "",
        providerAccountId: "",
        refresh_token: "",
        access_token: "",
        expires_at: "",
        token_type: "",
        scope: "",
        id_token: "",
        session_state: "",
        userId: "",
      };
    case "zh-TW":
      return {
        selfName: "帳號",
        id: "ID",
        type: "類型",
        provider: "",
        providerAccountId: "",
        refresh_token: "",
        access_token: "",
        expires_at: "",
        token_type: "",
        scope: "",
        id_token: "",
        session_state: "",
        userId: "",
      };
    case "en":
      return {
        selfName: "Account",
        id: "ID",
        type: "Type",
        provider: "",
        providerAccountId: "",
        refresh_token: "",
        access_token: "",
        expires_at: "",
        token_type: "",
        scope: "",
        id_token: "",
        session_state: "",
        userId: "",
      };
    case "ja":
      return {
        selfName: "アカウント",
        id: "ID",
        type: "タイプ",
        provider: "",
        providerAccountId: "",
        refresh_token: "",
        access_token: "",
        expires_at: "",
        token_type: "",
        scope: "",
        id_token: "",
        session_state: "",
        userId: "",
      };
  }
};
