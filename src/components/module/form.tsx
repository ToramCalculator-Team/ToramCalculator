import { createEffect, createMemo, createResource, createSignal, For, JSX, on, Show } from "solid-js";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";

import { setStore, store } from "~/store";
import { type Locale } from "~/locales/i18n";
import { ConvertToAllString } from "~/repositories/untils";
import { DB } from "../../../db/clientDB/generated/kysely/kyesely";

export default function Form<Item>(props: {
  tableName: keyof DB;
  item: () => Item;
  itemDic: (locale: Locale) => ConvertToAllString<Item>;
  formHiddenColumns: Array<keyof Item>;
}) {
  return (
    <OverlayScrollbarsComponent
      element="div"
      options={{ scrollbars: { autoHide: "scroll" } }}
      class="h-full"
    ></OverlayScrollbarsComponent>
  );
}
