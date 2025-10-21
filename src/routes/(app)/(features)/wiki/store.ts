import { createStore } from "solid-js/store";
import { DB } from "@db/generated/zod/index";
import { VisibilityState } from "@tanstack/solid-table";

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
});

export { wikiStore, setWikiStore };
