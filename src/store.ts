import { createStore } from "solid-js/store";
import { Locale } from "~/i18n";
import { defaultSelectMonster, SelectMonster } from "./schema/monster";

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
    monsterFormState: "CREATE" | "UPDATE" | "DISPLAY";
    filterState: boolean;
  };
};

export const initialStore: Store = {
  version: 0.001,
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
  indexPage: {
  },
  monsterPage: {
    augmented: true,
    monsterList: [],
    monsterDialogState: false,
    monsterFormState: "DISPLAY",
    filterState: false,
  },
};

const [store, setStore] = createStore<Store>(
  typeof window !== "undefined" && localStorage.getItem("store")
    ? { ...initialStore, ...JSON.parse(localStorage.getItem("store")!) }
    : initialStore,
);

export { store, setStore };
