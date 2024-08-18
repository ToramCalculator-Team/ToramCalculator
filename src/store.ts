import { createStore } from "solid-js/store";
import { Locale } from "~/i18n";
import { defaultSelectMonster, SelectMonster } from "./schema/monster";

type Store = {
  location: Locale;
  theme: "light" | "dark" | "system";
  index: {
    testCount: number;
  };
  monster: SelectMonster;
  monsterPage: {
    augmented: boolean;
    monsterList: SelectMonster[];
    monsterDialogState: boolean;
    monsterFormState: "CREATE" | "UPDATE" | "DISPLAY";
    filterState: boolean;
  }
};

const [store, setStore] = createStore<Store>({
  location: "zh-CN",
  theme: "system",
  index: {
    testCount: 0,
  },
  monster: defaultSelectMonster,
  monsterPage: {
    augmented: true,
    monsterList: [],
    monsterDialogState: false,
    monsterFormState: "DISPLAY",
    filterState: false,
  }
});

export { store, setStore };
