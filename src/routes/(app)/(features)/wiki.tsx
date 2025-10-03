import { createEffect, createMemo, createSignal, JSX, onMount, ParentProps, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import Icons from "~/components/icons/index";
import { Button  } from "~/components/controls/button";
import { Motion, Presence } from "solid-motionone";
import { DB } from "@db/generated/kysely/kysely";

export default function WikiPage(props: ParentProps) {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [tableType, setTableType] = createSignal<keyof DB>("mob");

  onMount(() => {
    console.log("--WikiPage Render");
  });

  return (
      <Motion.div
        animate={{ opacity: [0, 1] }}
        transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
        id="WikiContainer"
        class="WikiContainer relative flex h-full w-full flex-col"
      >
        {props.children}
      </Motion.div>
  );
}
