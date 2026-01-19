import en from "~/locales/dictionaries/en";
import ja from "~/locales/dictionaries/ja";
import zh_CN from "~/locales/dictionaries/zh_CN";
import zh_TW from "~/locales/dictionaries/zh_TW";

export const i18n = {
	defaultLocale: "zh-CN",
	locales: ["zh-CN", "zh-TW", "en", "ja"],
} as const;

export type Locale = (typeof i18n)["locales"][number];

export const getDictionary = (locale: Locale) => {
	switch (locale) {
		case "zh-CN":
			return zh_CN;
		case "zh-TW":
			return zh_TW;
		case "en":
			return en;
		case "ja":
			return ja;
		default:
			return zh_CN;
	}
};
