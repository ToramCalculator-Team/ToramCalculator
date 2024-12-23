import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { image } from "~/repositories/db/types";

export type Image = Awaited<ReturnType<typeof findImageById>>;
export type NewImage = Insertable<image>;
export type ImageUpdate = Updateable<image>;

export async function findImageById(id: string) {
  return await db.selectFrom("image").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
}

export async function updateImage(id: string, updateWith: ImageUpdate) {
  return await db.updateTable("image").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createImage(newImage: NewImage) {
  return await db.insertInto("image").values(newImage).returningAll().executeTakeFirst();
}

export async function deleteImage(id: string) {
  return await db.deleteFrom("image").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultImage: Image = {
  id: "",
  dataUrl: "data:image/png;base64,",
  npcId: null
};
