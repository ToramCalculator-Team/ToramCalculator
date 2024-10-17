import { createStore } from "solid-js/store";
import { Locale } from "~/locales/i18n";
import { defaultMonster, Monster } from "./repositories/monster";
import { defaultCrystal, Crystal } from "./repositories/crystal";
import { defaultSkill, Skill } from "./repositories/skill";
import { defaultCharacter, Character } from "./repositories/character";
import { defaultAnalyzer, Analyzer } from "./repositories/analyzer";
import { init } from "@paralleldrive/cuid2";

export type FormSate = "CREATE" | "UPDATE" | "DISPLAY"

export type Store = {
  version: number;
  dbVersion: number;
  theme: "light" | "dark";
  settingsDialogState: boolean;
  settings: {
    userInterface: {
      isAnimationEnabled: boolean;
    };
    language: Locale;
    statusAndSync: {
      restorePreviousStateOnStartup: boolean;
      syncStateAcrossClients: boolean;
    };
    privacy: {
      postVisibility: "everyone" | "friends" | "onlyMe";
    };
    messages: {
      notifyOnContentChange: {
        notifyOnReferencedContentChange: boolean;
        notifyOnLike: boolean;
        notifyOnBookmark: boolean;
      };
    };
  };
  monster: Monster;
  indexPage: {
  };
  monsterPage: {
    augmented: boolean;
    monsterList: Monster[];
    monsterDialogState: boolean;
    monsterFormState: FormSate;
    filterState: boolean;
  };
  crystal: Crystal;
  crystalPage: {
    augmented: boolean;
    crystalList: Crystal[];
    crystalDialogState: boolean;
    crystalFormState: FormSate;
    filterState: boolean;
  };
  skillPage: {
    skillList: Skill[];
    skill: Skill;
    skillDialogState: boolean;
    skillFormState: FormSate;
    filterState: boolean;
  };
  character: Character;
  characterPage: {
    augmented: boolean;
    characterList: Character[];
    characterDialogState: boolean;
    characterFormState: FormSate;
    filterState: boolean;
  };
  analyzer: Analyzer;
  analyzerPage: {
    analyzerList: Analyzer[];
    analyzerDialogState: boolean;
    analyzerFormState: FormSate;
    filterState: boolean;
  };
};

export const initialStore: Store = {
  version: 0.001,
  dbVersion: 0.001,
  theme: "light",
  settings: {
    userInterface: {
      isAnimationEnabled: true
    },
    language: "zh-CN",
    statusAndSync: {
      restorePreviousStateOnStartup: true,
      syncStateAcrossClients: true,
    },
    privacy: {
      postVisibility: "everyone"
    },
    messages: {
      notifyOnContentChange: {
        notifyOnReferencedContentChange: true,
        notifyOnLike: true,
        notifyOnBookmark: true
      }
    },
  },
  settingsDialogState: false,
  monster: defaultMonster,
  indexPage: {},
  monsterPage: {
    augmented: true,
    monsterList: [],
    monsterDialogState: false,
    monsterFormState: "DISPLAY",
    filterState: false,
  },
  crystal: defaultCrystal,
  crystalPage: {
    augmented: false,
    crystalList: [],
    crystalDialogState: false,
    crystalFormState: "CREATE",
    filterState: false
  },
  skillPage: {
    skillList: [],
    skill: defaultSkill,
    skillDialogState: false,
    skillFormState: "CREATE",
    filterState: false
  },
  character: defaultCharacter,
  characterPage: {
    augmented: false,
    characterList: [],
    characterDialogState: false,
    characterFormState: "CREATE",
    filterState: false
  },
  analyzer: defaultAnalyzer,
  analyzerPage: {
    analyzerList: [],
    analyzerDialogState: false,
    analyzerFormState: "CREATE",
    filterState: false
  }
};

const [store, setStore] = createStore<Store>(
  typeof window !== "undefined" && localStorage.getItem("store")
    ? { ...initialStore, ...JSON.parse(localStorage.getItem("store")!) }
    : initialStore,
);

const reset = () => setStore(initialStore);

export { store, setStore, reset };
