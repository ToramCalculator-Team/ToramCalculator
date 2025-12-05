import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createMemo, createResource, For, onMount, ParentProps, Show, useContext } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import Icons from "~/components/icons/index";
import { getDictionary } from "~/locales/i18n";
import { fieldInfo, Form } from "~/components/dataDisplay/form";
import { LogicEditor } from "~/components/features/logicEditor/LogicEditor";
import { Input } from "~/components/controls/input";
import { MemberBaseNestedSchema } from "~/components/features/simulator/core/Member/MemberBaseSchema";
import { DBForm } from "~/components/business/form/DBFormRenderer";
import { selectCharacterById } from "@db/generated/repositories/character";
import { CharacterSchema } from "@db/generated/zod";

export default function FunctionPage(props: ParentProps) {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));
  const characterFinder = (id: string) => selectCharacterById(id);
  const [character, { refetch: refetchCharacter }] = createResource(() => "defaultCharacterId", characterFinder);

  onMount(() => {
    console.log("--FunctionPage Render");
  });

  return (
    <Motion.main class="flex h-full w-full flex-col-reverse landscape:flex-row">
      <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        defer
        id="mainContent"
        class="bg-primary-color-90 z-40 h-full w-full landscape:landscape:px-12"
        style={{
          "transition-duration": "all 0s !important",
        }}
      >
        <Show when={character()}>
          {(varCharacter) => (
            <DBForm
              tableName="character"
              initialValue={varCharacter()}
              dataSchema={CharacterSchema}
            />
          )}
        </Show>
      </OverlayScrollbarsComponent>
    </Motion.main>
  );
}
