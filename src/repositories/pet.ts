import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, pet } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonObjectFrom } from "kysely/helpers/postgres";

export type Pet = Awaited<ReturnType<typeof findPetById>>;
export type NewPet = Insertable<pet>;
export type PetUpdate = Updateable<pet>;

export function petSubRelations(eb: ExpressionBuilder<DB, "pet">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "pet.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("statistics"),
  ];
}

export async function findPetById(id: string) {
  return await db
    .selectFrom("pet")
    .where("id", "=", id)
    .selectAll("pet")
    .select((eb) => petSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updatePet(id: string, updateWith: PetUpdate) {
  return await db.updateTable("pet").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createPet(newPet: NewPet) {
  return await db.transaction().execute(async (trx) => {
    const pet = await trx.insertInto("pet").values(newPet).returningAll().executeTakeFirstOrThrow();
    const statistics = await trx
      .insertInto("statistics")
      .values(defaultStatistics)
      .returningAll()
      .executeTakeFirstOrThrow();
    return { ...pet, statistics };
  });
}

export async function deletePet(id: string) {
  return await db.deleteFrom("pet").where("id", "=", id).returningAll().executeTakeFirst();
}

// default

export const defaultPet: Pet = {
  id: "defaultPetId",
  name: "defaultPetName",
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};

