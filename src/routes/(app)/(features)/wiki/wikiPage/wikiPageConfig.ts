import type { DB } from "@db/generated/zod";
import type { JSX } from "solid-js/jsx-runtime";
import type { Dictionary } from "~/locales/type";
import { AddressPage } from "./address";

export interface WikiPageConfig<T extends DB[keyof DB]> {
	mainContent: (dic: Dictionary, itemHandleClick: (data: T) => void) => JSX.Element;
}

export const wikiPageConfig: Partial<{
	[K in keyof DB]: WikiPageConfig<DB[K]>;
}> = {
	address: {
		mainContent: AddressPage,
	},
};
