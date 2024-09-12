import {
  type MonsterData,
  type SkillData,
  type CharacterData,
  type modifiers,
} from "~/routes/(app)/(functionPage)/analyzer/worker";
import { type SelectCrystal } from "~/schema/crystal";
import { type SelectSkill } from "~/schema/skill";
import { type SelectCharacter } from "~/schema/character";
import { $Enums } from "~/schema/enums";
import { SelectMonster } from "~/schema/monster";
import { SelectUser } from "~/schema/user";

// 为了方便编辑器自动补全，这个方法可以将对象的值类型转换为字符串
export type ConvertToAllString<T> = T extends Date | Date[] | modifiers | Array<object>
  ? string
  : T extends object
    ? {
        [K in keyof T]: ConvertToAllString<T[K]>;
      }
    : string;

interface dictionary {
  ui: {
    searchPlaceholder: string;
    columnsHidden: string;
    actions: {
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
      filter: string;
    };
    nav: {
      home: string;
      monsters: string;
      skills: string;
      equipments: string;
      crystals: string;
      pets: string;
      items: string;
      character: string;
      analyzer: string;
    };
    errorPage: {
      tips: string;
    };
    settings: {
      title: string;
      userInterface: {
        title: string;
        isAnimationEnabled: {
          title: string;
          description: string;
        };
      };
      language: {
        title: string;
        selectedLanguage: {
          title: string;
          description: string;
          zhCN: string;
          zhTW: string;
          enUS: string;
          jaJP: string;
        };
      };
      statusAndSync: {
        title: string;
        restorePreviousStateOnStartup: {
          title: string;
          description: string;
        };
        syncStateAcrossClients: {
          title: string;
          description: string;
        };
      };
      privacy: {
        title: string;
        postVisibility: {
          title: string;
          description: string;
          everyone: string;
          friends: string;
          onlyMe: string;
        };
      };
      messages: {
        title: string;
        notifyOnContentChange: {
          title: string;
          description: string;
          notifyOnReferencedContentChange: string;
          notifyOnLike: string;
          notifyOnBookmark: string;
        };
      };
      about: {
        title: string;
        description: {
          title: string;
          description: string;
        };
        version: {
          title: string;
          description: string;
        };
      };
    };
    index: {
      adventurer: string;
      goodMorning: string;
      goodAfternoon: string;
      goodEvening: string;
      nullSearchResultWarring: string;
      nullSearchResultTips: string;
    };
    monster: {
      pageTitle: string;
      table: {
        title: string;
        description: string;
      };
      news: {
        title: string;
      };
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
        description: string;
      };
    };
    crystal: {
      pageTitle: string;
      description: string;
      canNotModify: string;
      crystalForm: {
        description: string;
      };
    };
    skill: {
      pageTitle: string;
      description: string;
    };
    analyze: {
      pageTitle: string;
      description: string;
      actualValue: string;
      baseValue: string;
      modifiers: string;
      staticModifiers: string;
      dynamicModifiers: string;
      dialogData: ConvertToAllString<CharacterData & MonsterData & SkillData>;
    };
    character: {
      pageTitle: string;
      description: string;
    };
  };
  db: {
    enums: ConvertToAllString<$Enums>;
    models: {
      monster: ConvertToAllString<SelectMonster>;
      crystal: ConvertToAllString<SelectCrystal>;
      skill: ConvertToAllString<SelectSkill>;
      skillEffect: ConvertToAllString<SelectSkill["skillEffect"][0]>;
      skillCost: ConvertToAllString<SelectSkill["skillEffect"][0]["skillCost"][0]>;
      skillYield: ConvertToAllString<SelectSkill["skillEffect"][0]["skillYield"][0]>;
      user: ConvertToAllString<SelectUser>;
      character: ConvertToAllString<SelectCharacter>;
    };
  };
}
