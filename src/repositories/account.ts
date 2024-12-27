import { Expression, ExpressionBuilder, Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { account, DB } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { ModifyKeys,ConvertToAllString } from "./untils";
import { AccountType } from "./enums";
import { Locale } from "~/locales/i18n";

export type Account = ModifyKeys<
  Awaited<ReturnType<typeof findAccountById>>,
  {
    type: AccountType;
  }
>;

export type NewAccount = Insertable<account>;

export type AccountUpdate = Updateable<account>;

export function accountSubRelations(eb: ExpressionBuilder<DB, "account">, accountId: Expression<string>) {
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

export async function findAccountById(id: string) {
  const account = await db
    .selectFrom("account")
    .where("id", "=", id)
    .selectAll()
    .select((eb) => accountSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
  return account;
}

export async function updateAccount(id: string, updateWith: AccountUpdate) {
  return await db.transaction().execute(async (trx) => {
    const account = await trx
      .updateTable("account")
      .set(updateWith)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    return account;
  });
  // await db.updateTable('account').set(updateWith).where('id', '=', id).execute()
}

export async function createAccount(account: NewAccount) {
  return await db.insertInto("account").values(account).returningAll().executeTakeFirstOrThrow();
}

export async function deleteAccount(id: string) {
  return await db.deleteFrom("account").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultAccount: Account = {
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
  create: {
    accountId: "",
  },
  update: {
    accountId: "",
  },
};

export const AccountDic = (locale: Locale): ConvertToAllString<Account> => {
  switch (locale) {
    case "zh-CN":
    case "zh-HK":
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
    case "en-US":
    case "en-GB":
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
} 
