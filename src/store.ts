import { createStore } from "solid-js/store";
import { Locale } from "~/locales/i18n";
import { type Monster } from "./repositories/mob";
import { type Crystal } from "./repositories/crystal";
import { type Skill } from "./repositories/skill";
import { type Character } from "./repositories/character";
import { type Simulator } from "./repositories/simulator";

export type FormSate = "CREATE" | "UPDATE" | "DISPLAY"

export type Store = {
  version: number;
  dbVersion: number;
  theme: "light" | "dark";
  settingsDialogState: boolean;
  settings: {
    userInterface: {
      isAnimationEnabled: boolean;
      is3DbackgroundDisabled: boolean;
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
  indexPage: {
  };
  monsterPage: {
    augmented: boolean;
    monsterId: string;
    monsterList: Monster[];
    monsterDialogState: boolean;
    monsterFormState: FormSate;
    filterState: boolean;
  };
  crystalPage: {
    crystalId: string;
    crystalList: Crystal[];
    crystalDialogState: boolean;
    crystalFormState: FormSate;
    filterState: boolean;
  };
  skillPage: {
    skillId: string;
    skillList: Skill[];
    skillDialogState: boolean;
    skillFormState: FormSate;
    filterState: boolean;
  };
  characterPage: {
    characterId: string;
    characterList: Character[];
    characterDialogState: boolean;
    characterFormState: FormSate;
    filterState: boolean;
  };
  simulatorPage: {
    simulatorId: string;
    simulatorList: Simulator[];
    simulatorDialogState: boolean;
    simulatorFormState: FormSate;
    filterState: boolean;
  };
};

export const initialStore: Store = {
  version: 20241107,
  dbVersion: 0.001,
  theme: "light",
  settings: {
    userInterface: {
      isAnimationEnabled: true,
      is3DbackgroundDisabled: false
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
  indexPage: {},
  monsterPage: {
    augmented: true,
    monsterId: "defaultMonsterId",
    monsterList: [],
    monsterDialogState: false,
    monsterFormState: "DISPLAY",
    filterState: false,
  },
  crystalPage: {
    crystalId: "defaultCrystalId",
    crystalList: [],
    crystalDialogState: false,
    crystalFormState: "CREATE",
    filterState: false
  },
  skillPage: {
    skillId: "defaultSkillId",
    skillList: [],
    skillDialogState: false,
    skillFormState: "CREATE",
    filterState: false
  },
  characterPage: {
    characterId: "defaultCharacterId",
    characterList: [],
    characterDialogState: false,
    characterFormState: "CREATE",
    filterState: false
  },
  simulatorPage: {
    simulatorId: "defaultSimulatorId",
    simulatorList: [],
    simulatorDialogState: false,
    simulatorFormState: "CREATE",
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
