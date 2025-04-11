import { getDB } from "./database";
import { user, DB } from "../../db/kysely/kyesely";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";
import { createId } from "@paralleldrive/cuid2";
import { create } from "domain";
import { Expression, ExpressionBuilder, Kysely, Transaction } from "kysely";
import { createAccount, defaultAccount } from "./account";
import { jsonArrayFrom } from "kysely/helpers/postgres";

export interface User extends DataType<user> {
  MainTable: Awaited<ReturnType<typeof findUsers>>[number];
  MainForm: user;
}

export function userSubRelations(eb: ExpressionBuilder<DB, "user">, id: Expression<string>) {
  return [jsonArrayFrom(eb.selectFrom("account").where("account.userId", "=", id).selectAll("account")).as("accounts")];
}

export async function findUserById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("user")
    .where("id", "=", id)
    .select((eb) => userSubRelations(eb, eb.val(id)))
    .selectAll()
    .executeTakeFirstOrThrow();
}

export async function findUserByEmail(email: string) {
  const db = await getDB();
  return await db.selectFrom("user").where("email", "=", email).selectAll().executeTakeFirst();
}

export async function findUsers() {
  const db = await getDB();
  return await db.selectFrom("user").selectAll().execute();
}

export async function updateUser(id: string, updateWith: User["Update"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const user = await trx.updateTable("user").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
    return user;
  });
}

export async function insertUser(trx: Transaction<DB>, newUser: User["Insert"]) {
  return await trx
    .insertInto("user")
    .values({
      ...newUser,
      id: createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createUser(trx: Transaction<DB>, newUser: User["Insert"]) {
  const user = await insertUser(trx, newUser);
  await createAccount(trx, {
    ...defaultAccount,
    id: createId(),
    providerAccountId: createId(),
    userId: user.id,
  });
  return user;
}

export async function deleteUser(id: string) {
  const db = await getDB();
  return await db.deleteFrom("user").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultUser: User["Select"] = {
  id: "",
  name: "",
  email: null,
  password: null,
  emailVerified: null,
  image: null,
};

export const UserDic = (locale: Locale): ConvertToAllString<User["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        id: "ID",
        name: "名称",
        email: "邮箱",
        emailVerified: "邮箱验证",
        password: "密码",
        image: "图像",
        selfName: "用户",
      };
    case "zh-TW":
      return {
        id: "ID",
        name: "名稱",
        email: "郵箱",
        emailVerified: "郵箱驗證",
        password: "密碼",
        image: "圖像",
        selfName: "用戶",
      };
    case "en":
      return {
        id: "ID",
        name: "Name",
        email: "Email",
        emailVerified: "Email Verified",
        password: "Password",
        image: "Image",
        selfName: "User",
      };
    case "ja":
      return {
        id: "ID",
        name: "名前",
        email: "メールアドレス",
        emailVerified: "メール確認",
        password: "パスワード",
        image: "画像",
        selfName: "ユーザー",
      };
  }
};
