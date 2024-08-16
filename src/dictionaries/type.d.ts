import type { Monster } from "@/schema";
import {
  type MonsterData,
  type SkillData,
  type CharacterData,
  type modifiers,
} from "../[lang]/(functionPage)/analyze/worker";
import { type Crystal } from "~/schema/crystal";
import { type Skill } from "~/schema/skill";
import { type Character } from "~/schema/character";

// 为了方便编辑器自动补全，这个方法可以将数据库模型的值类型转换为字符串
export type ConvertToAllString<T> = T extends Date | Date[] | modifiers | Array<object>
  ? string
  : T extends object
    ? {
        [K in keyof T]: ConvertToAllString<T[K]>;
      }
    : string;

interface dictionary {
  ui: {
    adventurer: string;
    add: string;
    create: string;
    remove: string;
    upload: string;
    update: string;
    save: string;
    reset: string;
    modify: string;
    cancel: string;
    open: string;
    close: string;
    back: string;
    searchPlaceholder: string;
    filter: string;
    columnsHidden: string;
    root: {
      home: string;
      monsters: string;
      skills: string;
      equipments: string;
      crystals: string;
      pets: string;
      items: string;
      character: string;
      comboAnalyze: string;
      nullSearchResultWarring: string;
      nullSearchResultTips: string;
    };
    index: {
      goodMorning: string;
      goodAfternoon: string;
      goodEvening: string;
    };
    monster: {
      pageTitle: string;
      discription: string;
      augmented: string;
      canNotModify: string;
      monsterDegreeOfDifficulty: {
        0: string;
        1: string;
        2: string;
        3: string;
        4: string;
      };
      monsterForm: {
        discription: string;
      };
    };
    crystal: {
      pageTitle: string;
      discription: string;
      canNotModify: string;
      crystalForm: {
        discription: string;
      };
    };
    skill: {
      pageTitle: string;
      discription: string;
    };
    analyze: {
      pageTitle: string;
      discription: string;
      actualValue: string;
      baseValue: string;
      modifiers: string;
      staticModifiers: string;
      dynamicModifiers: string;
      dialogData: ConvertToAllString<CharacterData & MonsterData & SkillData>;
    };
    character: {
      pageTitle: string;
      discription: string;
    };
  };
  db: {
    enums: ConvertToAllString<typeof $Enums>;
    models: {
      monster: ConvertToAllString<Monster>;
      crystal: ConvertToAllString<Crystal>;
      skill: ConvertToAllString<Skill>;
      skillEffect: ConvertToAllString<Skill["skillEffect"][0]>;
      skillCost: ConvertToAllString<Skill["skillEffect"][0]["skillCost"][0]>;
      skillYield: ConvertToAllString<Skill["skillEffect"][0]["skillYield"][0]>;
      user: ConvertToAllString<User>;
      character: ConvertToAllString<Character>;
    };
  };
}
