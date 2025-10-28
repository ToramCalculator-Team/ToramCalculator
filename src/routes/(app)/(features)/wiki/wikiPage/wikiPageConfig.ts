import { DB } from "@db/generated/zod";
import { JSX } from "solid-js/jsx-runtime";
import { dictionary } from "~/locales/type";
import { AddressPage } from "./address";

export interface WikiPageConfig {
    mainContent: (dic: dictionary, itemHandleClick: (id: string) => void) => JSX.Element;
}

export const wikiPageConfig: Partial<Record<keyof DB, WikiPageConfig>> = {
    address: {
        mainContent: AddressPage
    }
}