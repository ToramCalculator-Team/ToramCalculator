import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { skill as Skill } from "../../drizzle/schema";
import {
  defaultInsertSkillEffect,
  defaultSelectSkillEffect,
  InsertSkillEffect,
  InsertSkillEffectSchema,
  SelectSkillEffect,
  SelectSkillEffectSchema,
} from "./skill_effect";
import {
  defaultSelectStatistics,
  InsertStatistics,
  InsertStatisticsSchema,
  SelectStatistics,
  SelectStatisticsSchema,
} from "./statistics";
import { z } from "zod";

// TS
export type SelectSkill = InferSelectModel<typeof Skill> & {
  skillEffect: SelectSkillEffect[];
  statistics: SelectStatistics;
};
export type InsertSkill = InferInsertModel<typeof Skill> & {
  skillEffect: InsertSkillEffect[];
  statistics: InsertStatistics;
};

// Zod
export const SelectSkillSchema = createSelectSchema(Skill).extend({
  skillEffect: z.array(SelectSkillEffectSchema),
  statistics: SelectStatisticsSchema,
});
export const InsertSkillSchema = createInsertSchema(Skill).extend({
  skillEffect: z.array(InsertSkillEffectSchema),
  statistics: InsertStatisticsSchema,
});

// default
export const defaultSelectSkill: SelectSkill = {
  id: "",
  name: "",
  skillDescription: "",
  skillTreeName: "BLADE",
  skillType: "ACTIVE_SKILL",
  weaponElementDependencyType: true,
  element: "NO_ELEMENT",
  skillEffect: [defaultSelectSkillEffect],
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultSelectStatistics,
  statisticsId: "",
};

export const defaultInsertSkill: InsertSkill = {
  id: "",
  name: "",
  skillDescription: "",
  skillTreeName: "BLADE",
  skillType: "ACTIVE_SKILL",
  weaponElementDependencyType: true,
  element: "NO_ELEMENT",
  skillEffect: [defaultInsertSkillEffect],
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultSelectStatistics,
  statisticsId: "",
};

export const testSkillQueryData: SelectSkill[] = [
  defaultSelectSkill,
  defaultSelectSkill,
  defaultSelectSkill,
]
