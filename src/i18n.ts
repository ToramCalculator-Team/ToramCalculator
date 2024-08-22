import zh_CN from "~/dictionaries/zh_CN";
import zh_TW from "~/dictionaries/zh_TW";
import en from "~/dictionaries/en";
import ja from "~/dictionaries/ja";
import { createMemo } from "solid-js";
import { store } from "./store";

export const i18n = {
  defaultLocale: "zh-CN",
  locales: ["zh-CN", "zh-TW", "zh-HK", "en", "en-US", "en-GB", "ja"],
} as const;

export type Locale = (typeof i18n)["locales"][number];

export const getDictionary = (locale: Locale) => {
  switch (locale) {
    case "zh-CN":
    case "zh-HK":
      return zh_CN;
    case "zh-TW":
      return zh_TW;
    case "en":
    case "en-US":
    case "en-GB":
      return en;
    case "ja":
      return ja;
    default:
      return zh_CN;
  }
};

export const dictionary = createMemo(() => getDictionary(store.location));