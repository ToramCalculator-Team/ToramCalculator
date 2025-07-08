import { DB } from "../../db/generated/kysely/kyesely";

export type FieldDetail = {
  key: string;
  tableFieldDescription: string;
  formFieldDescription: string;
};

type EnumFieldDetail<Enum extends string> = FieldDetail & {
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
    ? EnumFieldDetail<Extract<T[K], string>>
    : FieldDetail;
};

/**
 * 表描述结构
 */
export type Dic<T> = {
  selfName: string;
  description: string;
  fields: FieldDict<T>;
  cardFields?: Record<string,string>;
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
      install: string;
      unInstall: string;
      operation: string;
      searching: string;
    };
    nav: {
      home: string;
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
        colorTheme: {
          title: string;
          description: string;
        };
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
      tool: {
        title: string;
        pwa: {
          title: string;
          description: string;
          notSupported: string;
        };
        storageInfo: {
          title: string;
          description: string;
          usage: string;
          clearStorage: string;
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
    wiki: {
      selector: {
        title: string;
        groupName: {
          combat: string;
          daily: string;
        };
      };
      tableConfig: {
        title: string;
      };
      news: {
        title: string;
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
  db: { [K in keyof DB]: Dic<DB[K]> };
}
