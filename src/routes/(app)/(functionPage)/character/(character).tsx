import { defaultCharacter, Character } from "~/repositories/client/character";
import { createEffect, createMemo, createSignal, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";

export default function CharacterIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 状态管理参数
  const setCharacter = (value: Character["Insert"]) => setStore("character", "id", value.id);

  onMount(() => {
    console.log("--CharacterIndexPage Render");
    setCharacter(defaultCharacter);

    return () => {
      console.log("--CharacterIndexPage Unmount");
    };
  });

  return (
    <>
      <div class="Content flex flex-col gap-4 p-3">
        <a href="/character/defaultCharacterId">defaultCharacterId</a>
      </div>
    </>
  );
}
