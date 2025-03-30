import { DataEnums } from "../../../db/dataEnums";

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
      logIn: string;
      logOut: string;
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
  enums: DataEnums;
}

