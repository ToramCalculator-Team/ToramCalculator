import type { DB } from "@db/generated/zod";
import type { JSX } from "solid-js/jsx-runtime";
import type { Dictionary } from "~/locales/type";
import { AddressPage } from "./address";

export interface WikiPageConfig {
	mainContent: (dic: Dictionary, itemHandleClick: (id: string) => void) => JSX.Element;
}

export const wikiPageConfig: Partial<Record<keyof DB, WikiPageConfig>> = {
	address: {
		mainContent: AddressPage,
	},
};
