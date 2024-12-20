import { type Crystal } from "~/repositories/crystal";
import { type Skill } from "~/repositories/skill";
import { type Character } from "~/repositories/character";
import type { $Enums } from "@prisma/client";
import { Mob } from "~/repositories/mob";
import { User } from "~/repositories/user";

// 为了方便编辑器自动补全，这个方法可以递归地将对象的值类型转换为字符串
export type ConvertToAllString<T> = T extends Date | Date[] | Array<object> | number
  ? string
  : T extends Record<string, unknown>
    ? {
        [K in keyof T]: K extends string
          ? string extends K // 检查索引签名
            ? T[K] // 如果是索引签名，保持原有类型
            : ConvertToAllString<T[K]> // 否则递归转换
          : never;
      } & {
        selfName: string;
      }
    : string;

export interface dictionary {
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
      swap: string;
      reset: string;
      modify: string;
      cancel: string;
      open: string;
      close: string;
      back: string;
      filter: string;
      generateImage: string;
      checkInfo: string;
      zoomIn: string;
      zoomOut: string;
    };
    nav: {
      home: string;
      mobs: string;
      skills: string;
      equipments: string;
      crystals: string;
      pets: string;
      items: string;
      character: string;
      simulator: string;
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
        is3DbackgroundDisabled: {
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
    mob: {
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
      mobDegreeOfDifficulty: {
        0: string;
        1: string;
        2: string;
        3: string;
        4: string;
      };
      mobForm: {
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
    simulator: {
      pageTitle: string;
      description: string;
      actualValue: string;
      baseValue: string;
      modifiers: string;
      staticModifiers: string;
      dynamicModifiers: string;
      dialogData: ConvertToAllString<CharacterData>;
      simulatorPage: {
        mobsConfig: {
          title: string;
        };
        teamConfig: {
          title: string;
        };
      };
    };
    character: {
      pageTitle: string;
      description: string;
    };
  };
  db: {
    enums: ConvertToAllString<typeof $Enums>;
    models: {
      mob: ConvertToAllString<Mob>;
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
