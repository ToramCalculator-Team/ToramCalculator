import { Transaction } from "kysely";
import { db } from "./database";
import { DB, image } from "~/../db/clientDB/kysely/kyesely";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";

export interface Image extends DataType<image> {}

export async function findImageById(id: string) {
  return await db.selectFrom("image").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
}

export async function findImages() {
  return await db.selectFrom("image").selectAll().execute();
}

export async function updateImage(id: string, updateWith: Image["Update"]) {
  return await db.updateTable("image").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertImage(trx: Transaction<DB>, newImage: Image["Insert"]) {
  return await db.insertInto("image").values(newImage).returningAll().executeTakeFirst();
}

export async function createImage(newImage: Image["Insert"]) {
  return await db.insertInto("image").values(newImage).returningAll().executeTakeFirst();
}

export async function deleteImage(id: string) {
  return await db.deleteFrom("image").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultImage: Image["Select"] = {
  id: "",
  dataUrl: "data:image/png;base64,",
  npcId: null,
  weaponId: null,
  armorId: null,
  optEquipId: null,
  mobId: null,
};

// Dictionary
export const ImageDic = (locale: Locale): ConvertToAllString<Image["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "防具装备",
        id: "ID",
        dataUrl: "图像数据",
        npcId: "",
        weaponId: "",
        armorId: "",
        optEquipId: "",
        mobId: "",
      };
    case "zh-TW":
      return {
        selfName: "防具裝備",
        id: "ID",
        dataUrl: "圖像數據",
        npcId: "",
        weaponId: "",
        armorId: "",
        optEquipId: "",
        mobId: "",
      };
    case "en":
      return {
        selfName: "Armor",
        id: "ID",
        dataUrl: "Image Data",
        npcId: "",
        weaponId: "",
        armorId: "",
        optEquipId: "",
        mobId: "",
      };
    case "ja":
      return {
        selfName: "鎧",
        id: "ID",
        dataUrl: "イメージデータ",
        npcId: "",
        weaponId: "",
        armorId: "",
        optEquipId: "",
        mobId: "",
      };
  }
};
