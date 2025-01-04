import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, player } from "~/../db/clientDB/generated/kysely/kyesely";
import { defaultCharacter, characterSubRelations } from "./character";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultAccount } from "./account";

export type Player = Awaited<ReturnType<typeof findPlayerById>>;
export type NewPlayer = Insertable<player>;
export type PlayerUpdate = Updateable<player>;

export function playerSubRelations(eb: ExpressionBuilder<DB, "player">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("character")
        .whereRef("id", "=", "player.useIn")
        .selectAll("character")
        .select((subEb) => characterSubRelations(subEb, subEb.val("character.id"))),
    )
      .$notNull()
      .as("character"),
  ];
}

export async function findPlayerById(id: string) {
  return await db
    .selectFrom("player")
    .where("id", "=", id)
    .selectAll("player")
    .select((eb) => playerSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updatePlayer(id: string, updateWith: PlayerUpdate) {
  return await db.updateTable("player").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createPlayer(newPlayer: NewPlayer) {
  return await db.transaction().execute(async (trx) => {
    const player = await trx
      .insertInto("player")
      .values({
        ...newPlayer,
        // characterId: character.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return player;
  });
}

export async function deletePlayer(id: string) {
  return await db.deleteFrom("player").where("id", "=", id).returningAll().executeTakeFirst();
}
// Default
export const defaultPlayer: Player = {
  id: "defaultPlayer",
  name: "默认玩家",
  character: defaultCharacter,
  actions: [
    {
      id: "f6ga8jislfy0b1la9tb6kzd4",
      componentType: "task",
      type: "message",
      name: "开始!",
      properties: {
        message: "开始!",
      },
    },
    {
      id: "ns9onrpmso90h8sms5ym6gdb",
      componentType: "task",
      type: "calculation",
      name: "定义a = 1",
      properties: {
        formula: "a = 1",
      },
    },
    {
      id: "u6hk9fo3y8scv19t6xzjthoo",
      componentType: "task",
      type: "calculation",
      name: "定义b = 2",
      properties: {
        formula: "b = 2",
      },
    },
    {
      id: "u3e4xr3s11e3skojt2dvs7be",
      componentType: "container",
      type: "loop",
      name: "循环a < 20",
      sequence: [
        {
          id: "fz9ix97jbdytbjczzrxljoxn",
          componentType: "task",
          type: "calculation",
          name: "自增a = a + 2",
          properties: {
            formula: "a = a + 2",
          },
        },
        {
          id: "ct0qbyxxygwgckw17ovtyzty",
          componentType: "task",
          type: "calculation",
          name: "自减a = a + b - 1",
          properties: {
            formula: "a = a + b - 1",
          },
        },
        {
          id: "qtnjqf3820tedywdld9zqdj6",
          componentType: "switch",
          type: "if",
          name: "如果x大于50a < 10",
          branches: {
            true: [
              {
                id: "fre5bzzhvljc1v6yuiq6dcb1",
                componentType: "task",
                type: "message",
                name: "yes!",
                properties: {
                  message: "yes!",
                },
              },
            ],
            false: [
              {
                id: "zex3lg2ki0y9724mjdr8ttw2",
                componentType: "task",
                type: "message",
                name: "no...",
                properties: {
                  message: "no...",
                },
              },
            ],
          },
          properties: {
            condition: "a < 10",
          },
        },
      ],
      properties: {
        condition: "a < 20",
      },
    },
    {
      id: "lpw1pfo68ttueibwlpyjhevr",
      componentType: "task",
      type: "message",
      name: "结束",
      properties: {
        message: "结束",
      },
    },
  ],
  useIn: defaultCharacter.id,
  accountId: defaultAccount.id,
};
