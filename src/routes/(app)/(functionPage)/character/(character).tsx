import { defaultCharacter, Character } from "~/repositories/client/character";
import { createEffect, createMemo, createSignal, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";

export default function CharacterIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 状态管理参数
  const characterList = store.characterPage.characterList;
  const setCharacterList = (value: Character[]) => setStore("characterPage", "characterList", value);
  const character = defaultCharacter;
  const setCharacter = (value: Character) => setStore("characterPage", "characterId", value.id);

  const [computeResult, setComputeResult] = createSignal<JSX.Element | null>(null);
  const [dialogMeberIndex, setDialogMeberIndex] = createSignal<number>(0);

  onMount(() => {
    console.log("--CharacterIndexPage Render");
    setCharacterList([defaultCharacter, defaultCharacter]);
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
