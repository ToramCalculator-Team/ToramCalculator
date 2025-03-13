import { Expression, ExpressionBuilder } from "kysely";
import { db, typeDB } from "./database";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";

export interface Account extends DataType<typeDB["account"], typeof findAccountById, typeof createAccount> {}

export function accountSubRelations(eb: ExpressionBuilder<typeDB, "account">, accountId: Expression<string>) {
  return [
    // jsonArrayFrom(eb.selectFrom("character").where("character.masterId", "=", accountId).selectAll("character")).as(
    //   "characters",
    // ),
    // jsonArrayFrom(eb.selectFrom("mercenary").where("mercenary.masterId", "=", accountId).selectAll("mercenary")).as(
    //   "mercenarys",
    // ),
    // jsonArrayFrom(eb.selectFrom("custom_pet").where("custom_pet.masterId", "=", accountId).selectAll("custom_pet")).as(
    //   "customPets",
    // ),
    // jsonArrayFrom(
    //   eb.selectFrom("custom_weapon").where("custom_weapon.masterId", "=", accountId).selectAll("custom_weapon"),
    // ).as("weapons"),
    // jsonArrayFrom(
    //   eb.selectFrom("custom_armor").where("custom_armor.masterId", "=", accountId).selectAll("custom_armor"),
    // ).as("armors"),
    // jsonArrayFrom(
    //   eb
    //     .selectFrom("custom_additional_equipment")
    //     .where("custom_additional_equipment.masterId", "=", accountId)
    //     .selectAll("custom_additional_equipment"),
    // ).as("addEquips"),
    // jsonArrayFrom(
    //   eb
    //     .selectFrom("custom_special_equipment")
    //     .where("custom_special_equipment.masterId", "=", accountId)
    //     .selectAll("custom_special_equipment"),
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
  const startTime = performance.now();
  const account = await db.selectFrom("account").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
  const time = performance.now() - startTime;
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
export const defaultAccount: Account["Insert"] = {
  id: "defaultAccount",
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
export const AccountDic = (locale: Locale): ConvertToAllString<Account["Default"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "账号",
        id: "ID",
        type: "账号类型",
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
        create: {
          accountId: "",
          selfName: "",
        },
        update: {
          accountId: "",
          selfName: "",
        },
      };
    case "zh-TW":
      return {
        selfName: "帳號",
        id: "ID",
        type: "帳號類型",
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
        create: {
          accountId: "",
          selfName: "",
        },
        update: {
          accountId: "",
          selfName: "",
        },
      };
    case "en":
      return {
        selfName: "Account",
        id: "ID",
        type: "Account Type",
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
        create: {
          accountId: "",
          selfName: "",
        },
        update: {
          accountId: "",
          selfName: "",
        },
      };
    case "ja":
      return {
        selfName: "アカウント",
        id: "ID",
        type: "アカウントタイプ",
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
        create: {
          accountId: "",
          selfName: "",
        },
        update: {
          accountId: "",
          selfName: "",
        },
      };
  }
};
