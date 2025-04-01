import { Expression, ExpressionBuilder } from "kysely";
import { db } from "./database";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";
import { account, DB } from "../../../db/clientDB/kysely/kyesely";

export interface Account extends DataType<account> {
  MainTable: Awaited<ReturnType<typeof findAccounts>>[number];
}

export function accountSubRelations(eb: ExpressionBuilder<DB, "account">, accountId: Expression<string>) {
  return [
    // jsonArrayFrom(eb.selectFrom("character").where("character.masterId", "=", accountId).selectAll("character")).as(
    //   "characters",
    // ),
    // jsonArrayFrom(eb.selectFrom("mercenary").where("mercenary.masterId", "=", accountId).selectAll("mercenary")).as(
    //   "mercenarys",
    // ),
    // jsonArrayFrom(eb.selectFrom("player_pet").where("player_pet.masterId", "=", accountId).selectAll("player_pet")).as(
    //   "customPets",
    // ),
    // jsonArrayFrom(
    //   eb.selectFrom("player_weapon").where("player_weapon.masterId", "=", accountId).selectAll("player_weapon"),
    // ).as("weapons"),
    // jsonArrayFrom(
    //   eb.selectFrom("player_armor").where("player_armor.masterId", "=", accountId).selectAll("player_armor"),
    // ).as("armors"),
    // jsonArrayFrom(
    //   eb
    //     .selectFrom("player_option")
    //     .where("player_option.masterId", "=", accountId)
    //     .selectAll("player_option"),
    // ).as("optEquips"),
    // jsonArrayFrom(
    //   eb
    //     .selectFrom("player_special")
    //     .where("player_special.masterId", "=", accountId)
    //     .selectAll("player_special"),
    // ).as("speEquips"),
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
  const account = await db.selectFrom("account").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
  return account;
};

export async function findAccountById(id: string) {
  const account = await db
    .selectFrom("account")
    .where("id", "=", id)
    .selectAll()
    .select((eb) => accountSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
  return account;
}

export async function findAccounts() {
  const accounts = await db.selectFrom("account").selectAll().execute();
  return accounts;
}

export async function updateAccount(id: string, updateWith: Account["Update"]) {
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

export async function createAccount(account: Account["Insert"]) {
  return await db.insertInto("account").values(account).returningAll().executeTakeFirstOrThrow();
}

export async function deleteAccount(id: string) {
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
