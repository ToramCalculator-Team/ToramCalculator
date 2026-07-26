import type { DB } from "@db/generated/zod/index";
import type { VisibilityState } from "@tanstack/solid-table";
import { createStore } from "solid-js/store";

export type WikiStore = {
	type: keyof DB;
	table: {
		globalFilterStr: string;
		columnVisibility: VisibilityState;
		configSheetIsOpen: boolean;
	};
};

const [wikiStore, setWikiStore] = createStore<WikiStore>({
	type: "mob",
	table: {
		globalFilterStr: "",
		columnVisibility: {},
		configSheetIsOpen: false,
	},
});

export { wikiStore, setWikiStore };
