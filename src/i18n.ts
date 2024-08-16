import zh_CN from "~/dictionaries/zh_CN"
import zh_TW from "~/dictionaries/zh_TW"
import en from "~/dictionaries/en"
import ja from "~/dictionaries/ja"

const i18n = {
  defaultLocale: "zh-CN",
  locales: ["zh-CN", "zh-TW", "zh-HK", "en", "en-US", "en-GB", "ja"],
} as const;

export type Locale = (typeof i18n)["locales"][number];

export const getDictionary = (locale: Locale) => {
  switch (locale) {
    case "zh-CN" || "zh-HK":
      return zh_CN;
    case "zh-TW":
      return zh_TW;
    case "en" || "en-US" || "en-GB":
      return en;
    case "ja":
      return ja;
    default:
      return zh_CN;
  }
};

