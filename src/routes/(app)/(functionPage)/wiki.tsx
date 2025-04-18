import { createEffect, createMemo, createSignal, JSX, onMount, ParentProps, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import * as Icon from "~/components/icon";
import Button from "~/components/controls/button";
import { Motion, Presence } from "solid-motionone";
import { DB } from "~/../db/kysely/kyesely";

export default function WikiPage(props: ParentProps) {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [tableType, setTableType] = createSignal<keyof DB>("mob");

  onMount(() => {
    console.log("--WikiPage Render");
  });

  return <div class="Wiki flex h-[calc(100dvh-67px)] w-full flex-col overflow-hidden lg:h-dvh">{props.children}</div>;
}
