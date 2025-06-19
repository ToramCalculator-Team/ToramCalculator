import { createStore } from "solid-js/store";
import { DB } from "../../../../../db/kysely/kyesely";
import { VisibilityState } from "@tanstack/solid-table";
import { createEffect, on } from "solid-js";

export type WikiStore = {
  type: keyof DB;
  table: {
    globalFilterStr: string;
    columnVisibility: VisibilityState;
    configSheetIsOpen: boolean;
  };
  form: {
    data: Record<string, unknown> | undefined;
    isOpen: boolean;
  };
  cardGroup: {
    type: keyof DB;
    id: string;
  }[];
};

const [wikiStore, setWikiStore] = createStore<WikiStore>({
  type: "mob",
  table: {
    globalFilterStr: "",
    columnVisibility: {},
    configSheetIsOpen: false,
  },
  form: {
    data: {},
    isOpen: false,
  },
  cardGroup: [],
});

export { wikiStore, setWikiStore };
