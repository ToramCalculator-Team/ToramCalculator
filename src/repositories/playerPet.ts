import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, player_pet } from "../../db/generated/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { mobSubRelations } from "./mob";
import { DataType } from "./untils";

export interface PlayerPet extends DataType<player_pet> {
  MainTable: Awaited<ReturnType<typeof findPlayerPets>>[number];
  MainForm: player_pet;
}

export function customPetSubRelations(eb: ExpressionBuilder<DB, "player_pet">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("mob")
        .whereRef("id", "=", "player_pet.templateId")
        .selectAll("mob")
        .select((eb) => mobSubRelations(eb, eb.val(id))),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findPlayerPetById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_pet")
    .where("id", "=", id)
    .selectAll("player_pet")
    .select((eb) => customPetSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerPets() {
  const db = await getDB();
  return await db.selectFrom("player_pet").selectAll("player_pet").execute();
}

export async function updatePlayerPet(id: string, updateWith: PlayerPet["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_pet").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deletePlayerPet(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_pet").where("id", "=", id).returningAll().executeTakeFirst();
}
