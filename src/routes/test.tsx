import { createEffect, createMemo, createResource, createSignal, JSX, onMount, ParentProps, Show } from "solid-js";
import { setStore, store } from "~/store";
import { z } from "zod";
import { zoneSchema, drop_itemSchema, statisticSchema, mobSchema } from "../../db/zod";
import { mobDataConfig } from "./(app)/(functionPage)/wiki/dataConfig/mobDataConfig";
import { getDictionary } from "~/locales/i18n";
import { VirtualTable } from "~/components/module/virtualTable";

export default function WikiPage(props: ParentProps) {
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [filterStr, setFilterStr] = createSignal<string>("");

  return (
    VirtualTable({
      dataFetcher: mobDataConfig.table.dataFetcher,
      columnsDef: mobDataConfig.table.columnDef,
      hiddenColumnDef: mobDataConfig.table.hiddenColumnDef,
      tdGenerator: mobDataConfig.table.tdGenerator,
      defaultSort: mobDataConfig.table.defaultSort,
      globalFilterStr: filterStr,
      dictionary: dictionary().db.mob,
      columnHandleClick: (id) => console.log("columnHandleClick", id),
    })
  );
}
