import { getDB } from "./database";
import { user, DB } from "../generated/kysely/kysely";
import { Selectable, Insertable, Updateable } from "kysely";
import { createId } from "@paralleldrive/cuid2";
import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { createAccount } from "./account";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { defaultData } from "../defaultData";

// 1. 类型定义
export type User = Selectable<user>;
export type UserInsert = Insertable<user>;
export type UserUpdate = Updateable<user>;
// 关联查询类型
export type UserWithRelations = Awaited<ReturnType<typeof findUserWithRelations>>;

// 2. 关联查询定义
export function userSubRelations(eb: ExpressionBuilder<DB, "user">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb.selectFrom("account")
        .where("account.userId", "=", id)
        .selectAll("account")
    ).as("accounts")
  ];
}

// 3. 基础 CRUD 方法
export async function findUserById(id: string): Promise<User | null> {
  const db = await getDB();
  return await db
    .selectFrom("user")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst() || null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDB();
  return await db
    .selectFrom("user")
    .where("email", "=", email)
    .selectAll()
    .executeTakeFirst() || null;
}

export async function findUsers(): Promise<User[]> {
  const db = await getDB();
  return await db
    .selectFrom("user")
    .selectAll()
    .execute();
}

export async function insertUser(trx: Transaction<DB>, data: UserInsert): Promise<User> {
  return await trx
    .insertInto("user")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createUser(trx: Transaction<DB>, data: UserInsert): Promise<User> {
  // 1. 插入用户数据
  const user = await trx
    .insertInto("user")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  // 2. 创建关联的账户数据
  await createAccount(trx, {
    ...defaultData.account,
    id: createId(),
    providerAccountId: createId(),
    userId: user.id,
  });

  return user;
}

export async function updateUser(trx: Transaction<DB>, id: string, data: UserUpdate): Promise<User> {
  return await trx
    .updateTable("user")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteUser(trx: Transaction<DB>, id: string): Promise<User | null> {
  return await trx
    .deleteFrom("user")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findUserWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("user")
    .where("id", "=", id)
    .selectAll("user")
    .select((eb) => userSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
