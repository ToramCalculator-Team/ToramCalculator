import { DataEnums } from "../../db/dataEnums";
import { DB } from "~/../db/kysely/kyesely";

type FieldDescription = {
  key: string;
  tableFieldDescription: string;
  formFieldDescription: string;
};

type EnumFieldDescription<Enum extends string> = FieldDescription & {
  enumMap: Record<Enum, string>;
};

/**
 * 判断 T 是否是 string literal union（不是 string 自身）
 */
type IsStringLiteralUnionOnly<T> = [T] extends [string] ? (string extends T ? false : true) : false;

/**
 * 字段字典结构：对 string literal union 字段加 enumMap
 */
type FieldDict<T> = {
  [K in keyof T]: IsStringLiteralUnionOnly<T[K]> extends true
    ? EnumFieldDescription<Extract<T[K], string>>
    : FieldDescription;
};

/**
 * 表描述结构
 */
export type ConvertToDic<T> = {
  selfName: string;
  fields: FieldDict<T>;
};

export interface dictionary {
  ui: {
    searchPlaceholder: string;
    columnsHidden: string;
    boolean: {
      true: string;
      false: string;
    };
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
      logIn: string;
      logOut: string;
      register: string;
      switchUser: string;
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
      profile: string;
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
      difficultyflag: {
        Easy: string;
        Normal: string;
        Hard: string;
        Lunatic: string;
        Ultimate: string;
      };
      form: {
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
      table: {
        title: string;
        description: string;
      };
      news: {
        title: string;
      };
      form: {
        description: string;
      };
    };
    simulator: {
      pageTitle: string;
      description: string;
      actualValue: string;
      baseValue: string;
      modifiers: string;
      staticModifiers: string;
      dynamicModifiers: string;
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
  db: { [K in keyof DB]: ConvertToDic<DB[K]> };
  enums: DataEnums;
}
