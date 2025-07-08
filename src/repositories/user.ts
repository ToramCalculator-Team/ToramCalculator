import { getDB } from "./database";
import { user, DB } from "../../db/generated/kysely/kyesely";
import { DataType } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { createAccount } from "./account";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { defaultData } from "../../db/defaultData";

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
    ...defaultData.account,
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
