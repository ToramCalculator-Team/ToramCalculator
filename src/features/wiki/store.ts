import type { DB } from "@db/generated/zod/index";
import type { ColumnVisibilityState } from "@tanstack/solid-table";
import { createStore } from "solid-js/store";

export type WikiStore = {
	type: keyof DB;
	table: {
		globalFilterStr: string;
		columnVisibility: ColumnVisibilityState;
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
