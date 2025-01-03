import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { user } from "~/../db/clientDB/generated/kysely/kyesely";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { UserRole } from "./enums";
import { Locale } from "~/locales/i18n";

export type User = ModifyKeys<Awaited<ReturnType<typeof findUserById>>, {
  userRole: UserRole
}>;
export type NewUser = Insertable<user>;
export type UserUpdate = Updateable<user>;

export async function findUserById(id: string) {
  return await db.selectFrom("user").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
}

// export async function findPeople(criteria: Partial<user>) {
//   let query = db.selectFrom('user')

//   if (criteria.id) {
//     query = query.where('id', '=', criteria.id) // Kysely is immutable, you must re-assign!
//   }

//   if (criteria.first_name) {
//     query = query.where('first_name', '=', criteria.first_name)
//   }

//   if (criteria.last_name !== undefined) {
//     query = query.where(
//       'last_name',
//       criteria.last_name === null ? 'is' : '=',
//       criteria.last_name
//     )
//   }

//   if (criteria.gender) {
//     query = query.where('gender', '=', criteria.gender)
//   }

//   if (criteria.created_at) {
//     query = query.where('created_at', '=', criteria.created_at)
//   }

//   return await query.selectAll().execute()
// }

export async function updateUser(id: string, updateWith: UserUpdate) {
  return await db.transaction().execute(async (trx) => {
    const user = await trx.updateTable("user").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
    return user;
  });
  // await db.updateTable('user').set(updateWith).where('id', '=', id).execute()
}

export async function createUser(user: NewUser) {
  return await db.insertInto("user").values(user).returningAll().executeTakeFirstOrThrow();
}

export async function deleteUser(id: string) {
  return await db.deleteFrom("user").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultUser: User = {
  id: "defaultSelectUserId",
  name: "defaultSelectUserName",
  email: null,
  emailVerified: null,
  image: null,
  userRole: "USER",
};

export const UserDic = (locale: Locale): ConvertToAllString<User> => {
  switch (locale) {
    case "zh-CN":
      return {
        id: "ID",
        name: "名称",
        email: "邮箱",
        emailVerified: "邮箱验证",
        image: "图像",
        userRole: "用户角色",
        selfName: "用户",
      };
    case "zh-TW":
      return {
        id: "ID",
        name: "名稱",
        email: "郵箱",
        emailVerified: "郵箱驗證",
        image: "圖像",
        userRole: "用戶角色",
        selfName: "用戶",
      };
    case "en":
      return {
        id: "ID",
        name: "Name",
        email: "Email",
        emailVerified: "Email Verified",
        image: "Image",
        userRole: "User Role",
        selfName: "User",
      };
    case "ja": 
      return {
        id: "ID",
        name: "名前",
        email: "メールアドレス",
        emailVerified: "メール確認",
        image: "画像",
        userRole: "ユーザー角色",
        selfName: "ユーザー",
      };
  }
}
