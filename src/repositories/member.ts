import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, member } from "~/../db/kysely/kyesely";
import { playerSubRelations } from "./player";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";

export interface Member extends DataType<member> {
  MainTable: Awaited<ReturnType<typeof findMembers>>[number];
  MainForm: member;
}

export function memberSubRelations(eb: ExpressionBuilder<DB, "member">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("player")
        .whereRef("id", "=", "member.playerId")
        .selectAll("player")
        .select((subEb) => playerSubRelations(subEb, subEb.val(id))),
    ).as("player"),
    jsonObjectFrom(eb.selectFrom("mercenary").whereRef("id", "=", "member.mercenaryId").selectAll("mercenary")).as(
      "mercenary",
    ),
    jsonObjectFrom(eb.selectFrom("mercenary").whereRef("id", "=", "member.partnerId").selectAll("mercenary")).as(
      "partner",
    ),
    jsonObjectFrom(eb.selectFrom("mob").whereRef("id", "=", "member.mobId").selectAll("mob")).as("mob"),
  ];
}

export async function findMemberById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("member")
    .where("id", "=", id)
    .selectAll("member")
    .select((eb) => memberSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findMembers() {
  const db = await getDB();
  return await db.selectFrom("member").selectAll("member").execute();
}

export async function updateMember(id: string, updateWith: Member["Update"]) {
  const db = await getDB();
  return await db.updateTable("member").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMember(newMember: Member["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const member = await trx
      .insertInto("member")
      .values({
        ...newMember,
        // characterId: character.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return member;
  });
}

export async function deleteMember(id: string) {
  const db = await getDB();
  return await db.deleteFrom("member").where("id", "=", id).returningAll().executeTakeFirst();
}
// Default
export const defaultMember: Member["Select"] = {
  id: "",
  name: "",
  teamId: "",
  playerId: "",
  mobId: "",
  mobDifficultyFlag: "Easy",
  mercenaryId: "",
  partnerId: "",
  sequence: 0,
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
};
