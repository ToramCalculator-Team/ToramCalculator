import { createContext, createMemo, type ParentProps, useContext } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import type { Dictionary } from "~/locales/type";
import { store } from "~/store";

const DictionaryContext = createContext<() => Dictionary>();

export function DictionaryProvider(props: ParentProps) {
	const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

	return <DictionaryContext.Provider value={dictionary}>{props.children}</DictionaryContext.Provider>;
}

export function useDictionary() {
	const ctx = useContext(DictionaryContext);
	if (!ctx) {
		throw new Error("useDictionary must be used within a DictionaryProvider");
	}
	return ctx;
}
