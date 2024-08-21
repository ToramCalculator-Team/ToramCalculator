import { createStore } from "solid-js/store";
import { Locale } from "~/i18n";
import { defaultSelectMonster, SelectMonster } from "./schema/monster";

type Store = {
  location: Locale;
  theme: "light" | "dark";
  durtion: boolean;
  monster: SelectMonster;
  indexPage: {
    settingsDialogState: boolean;
  };
  monsterPage: {
    augmented: boolean;
    monsterList: SelectMonster[];
    monsterDialogState: boolean;
    monsterFormState: "CREATE" | "UPDATE" | "DISPLAY";
    filterState: boolean;
  };
};

const initialStore: Store = {
  location: "zh-CN",
  theme: "light",
  durtion: false,
  monster: defaultSelectMonster,
  indexPage: {
    settingsDialogState: false,
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
