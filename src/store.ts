import { createStore } from "solid-js/store";
import { Locale } from "~/i18n";
import { defaultSelectMonster, SelectMonster } from "./schema/monster";

type Store = {
  location: Locale;
  theme: "light" | "dark";
  settingsDialogState: boolean;
  durtion: boolean;
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

const initialStore: Store = {
  location: "zh-CN",
  theme: "light",
  settingsDialogState: false,
  durtion: true,
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
