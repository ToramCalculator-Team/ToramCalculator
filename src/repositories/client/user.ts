import { db } from "./database";
import { user, DB } from "../../../db/clientDB/kysely/kyesely";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";
import { createId } from "@paralleldrive/cuid2";

export interface User extends DataType<user> {
  MainTable: Awaited<ReturnType<typeof findUsers>>[number];
  MainForm: user;
}

export async function findUserById(id: string) {
  return await db.selectFrom("user").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
}

export async function findUsers() {
  return await db.selectFrom("user").selectAll().execute();
}

export async function updateUser(id: string, updateWith: User["Update"]) {
  return await db.transaction().execute(async (trx) => {
    const user = await trx.updateTable("user").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
    return user;
  });
}

export async function createUser(user: User["Insert"]) {
  return await db.insertInto("user").values({
    ...user,
    id: createId(),
  }).returningAll().executeTakeFirstOrThrow();
}

export async function deleteUser(id: string) {
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
