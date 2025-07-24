import { Character } from "@db/repositories/character";
import { BabylonBg } from "~/components/features/BabylonGame";
import { createEffect, createMemo, createSignal, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import { defaultData } from "@db/defaultData";
import { Button } from "~/components/controls/button";
import { A } from "@solidjs/router";

export default function CharacterIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 状态管理参数
  const setCharacter = (value: Character["Insert"]) => setStore("character", "id", value.id);

  onMount(() => {
    console.log("--CharacterIndexPage Render");
    setCharacter(defaultData.character);

    return () => {
      console.log("--CharacterIndexPage Unmount");
    };
  });

  return (
    <>
      <div class="Content flex flex-col gap-4 p-3">
        <A href="/character/defaultCharacterId">
          <Button>defaultCharacterId</Button>
        </A>
      </div>

      <BabylonBg  />
    </>
  );
}
