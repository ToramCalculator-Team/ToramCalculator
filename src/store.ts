import { createStore } from "solid-js/store";
import { Locale } from "~/locales/i18n";
import { defaultSelectMonster, SelectMonster } from "./repositories/monster";
import { defaultSelectCrystal, SelectCrystal } from "./repositories/crystal";
import { defaultSelectSkill, SelectSkill } from "./repositories/skill";
import { defaultSelectCharacter, SelectCharacter } from "./repositories/character";
import { defaultSelectAnalyzer, SelectAnalyzer } from "./repositories/analyzer";
import { init } from "@paralleldrive/cuid2";

export type FormSate = "CREATE" | "UPDATE" | "DISPLAY"

export type Store = {
  version: number;
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
  monster: SelectMonster;
  indexPage: {
  };
  monsterPage: {
    augmented: boolean;
    monsterList: SelectMonster[];
    monsterDialogState: boolean;
    monsterFormState: FormSate;
    filterState: boolean;
  };
  crystal: SelectCrystal;
  crystalPage: {
    augmented: boolean;
    crystalList: SelectCrystal[];
    crystalDialogState: boolean;
    crystalFormState: FormSate;
    filterState: boolean;
  };
  skillPage: {
    skillList: SelectSkill[];
    skill: SelectSkill;
    skillDialogState: boolean;
    skillFormState: FormSate;
    filterState: boolean;
  };
  character: SelectCharacter;
  characterPage: {
    augmented: boolean;
    characterList: SelectCharacter[];
    characterDialogState: boolean;
    characterFormState: FormSate;
    filterState: boolean;
  };
  analyzer: SelectAnalyzer;
  analyzerPage: {
    analyzerList: SelectAnalyzer[];
    analyzerDialogState: boolean;
    analyzerFormState: FormSate;
    filterState: boolean;
  };
};

export const initialStore: Store = {
  version: 0.002,
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
  monster: defaultSelectMonster,
  indexPage: {},
  monsterPage: {
    augmented: true,
    monsterList: [],
    monsterDialogState: false,
    monsterFormState: "DISPLAY",
    filterState: false,
  },
  crystal: defaultSelectCrystal,
  crystalPage: {
    augmented: false,
    crystalList: [],
    crystalDialogState: false,
    crystalFormState: "CREATE",
    filterState: false
  },
  skillPage: {
    skillList: [],
    skill: defaultSelectSkill,
    skillDialogState: false,
    skillFormState: "CREATE",
    filterState: false
  },
  character: defaultSelectCharacter,
  characterPage: {
    augmented: false,
    characterList: [],
    characterDialogState: false,
    characterFormState: "CREATE",
    filterState: false
  },
  analyzer: defaultSelectAnalyzer,
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
