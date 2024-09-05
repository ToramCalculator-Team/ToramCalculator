import zh_CN from "~/locales/dictionaries/zh_CN";
import zh_TW from "~/locales/dictionaries/zh_TW";
import en from "~/locales/dictionaries/en";
import ja from "~/locales/dictionaries/ja";

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