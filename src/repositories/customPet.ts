import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_pet } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultMob, mobSubRelations } from "./mob";

export type CustomPet = Awaited<ReturnType<typeof findCustomPetById>>;
export type NewCustomPet = Insertable<custom_pet>;
export type CustomPetUpdate = Updateable<custom_pet>;

export function custom_petSubRelations(eb: ExpressionBuilder<DB, "custom_pet">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("mob")
        .whereRef("id", "=", "custom_pet.templateId")
        .selectAll("mob")
        .select((eb) => mobSubRelations(eb, eb.val(id))),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findCustomPetById(id: string) {
  return await db
    .selectFrom("custom_pet")
    .where("id", "=", id)
    .selectAll("custom_pet")
    .select((eb) => custom_petSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCustomPet(id: string, updateWith: CustomPetUpdate) {
  return await db.updateTable("custom_pet").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteCustomPet(id: string) {
  return await db.deleteFrom("custom_pet").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultCustomPet: CustomPet = {
    id: "",
    template: defaultMob,
    templateId: defaultMob.id,
    pStr: 0,
    pInt: 0,
    pVit: 0,
    pAgi: 0,
    pDex: 0,
    str: 0,
    int: 0,
    vit: 0,
    agi: 0,
    dex: 0,
    weaponType: "",
    persona: "Fervent",
    type: "AllTrades",
    weaponAtk: 0,
    masterId: "",
};
