import { memeber as Member } from "~/../db/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { defaultSelectCharacter, SelectCharacter, SelectCharacterSchema } from "./character";

// TS
export type SelectMember = InferSelectModel<typeof Member> & {
  character: SelectCharacter;
};

// Zod
export const SelectMemberSchema = createSelectSchema(Member).extend({
  character: SelectCharacterSchema,
});
// Default
export const defaultSelectMember: SelectMember = {
  id: "",
  character: defaultSelectCharacter,
  characterId: "",
  flow: [
    {
      id: "systemStart",
      componentType: "task",
      type: "message",
      name: "开始!",
      properties: { message: "开始!" },
    },
    {
      id: "systemEnd",
      componentType: "task",
      type: "message",
      name: "结束",
      properties: { message: "结束" },
    },
  ],
};
