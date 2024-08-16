import { createStore } from "solid-js/store";
import { Locale } from "~/i18n";

type Store = {
  location: Locale;
  theme: "light" | "dark" | "system";
  index: {
    testCount: number;
  };
};

const [store, setStore] = createStore<Store>({
  location: "zh-CN",
  theme: "system",
  index: {
    testCount: 0,
  },
});

export { store, setStore };
