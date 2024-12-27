import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { image } from "~/repositories/db/types";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";

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
  dataUrl: "data:image/png;base64,"
};

// Dictionary
export const ImageDic = (locale: Locale): ConvertToAllString<Image> => {
  switch (locale) {
    case "zh-CN":
    case "zh-HK":
      return {
        selfName: "防具装备",
        id: "ID",
        dataUrl: "图像数据"
      };
    case "zh-TW":
      return {
        selfName: "防具裝備",
        id: "ID",
        dataUrl: "圖像數據"
      };
    case "en":
    case "en-US":
    case "en-GB":
      return {
        selfName: "Armor",
        id: "ID",
        dataUrl: "Image Data",
      };
    case "ja":
      return {
        selfName: "鎧",
        id: "ID",
        dataUrl: "イメージデータ",
      };
  }
};
