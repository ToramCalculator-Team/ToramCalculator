import type { DB } from "@db/generated/zod";
import type { JSX } from "solid-js/jsx-runtime";
import type { Dictionary } from "~/locales/type";
import { AddressPage } from "./address";
import { SkillPage } from "./skill";

export interface WikiPageConfig {
	mainContent: () => JSX.Element;
}

export const wikiPageConfig: Partial<{
	[K in keyof DB]: WikiPageConfig;
}> = {
	address: {
		mainContent: AddressPage,
	},
	skill: {
		mainContent: SkillPage,
	},
};
