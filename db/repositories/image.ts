import { Transaction } from "kysely";
import { getDB } from "./database";
import { DB, image } from "../generated/kysely/kyesely";
import { DataType } from "./untils";

export interface Image extends DataType<image> {}

export async function findImageById(id: string) {
  const db = await getDB();
  return await db.selectFrom("image").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
}

export async function findImages() {
  const db = await getDB();
  return await db.selectFrom("image").selectAll().execute();
}

export async function updateImage(id: string, updateWith: Image["Update"]) {
  const db = await getDB();
  return await db.updateTable("image").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertImage(trx: Transaction<DB>, newImage: Image["Insert"]) {
  const db = await getDB();
  return await db.insertInto("image").values(newImage).returningAll().executeTakeFirst();
}

export async function createImage(newImage: Image["Insert"]) {
  const db = await getDB();
  return await db.insertInto("image").values(newImage).returningAll().executeTakeFirst();
}

export async function deleteImage(id: string) {
  const db = await getDB();
  return await db.deleteFrom("image").where("id", "=", id).returningAll().executeTakeFirst();
}
