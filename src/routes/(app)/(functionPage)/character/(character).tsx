import { defaultCharacter, Character } from "~/repositories/character";
import { createEffect, createSignal, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import Button from "~/components/ui/button";
import BabylonBg from "./babylonBg";

export default function CharacterIndexPage() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  // 状态管理参数
  const characterList = store.characterPage.characterList;
  const setCharacterList = (value: Character[]) => setStore("characterPage", "characterList", value);
  const character = store.character;
  const setCharacter = (value: Character) => setStore("character", value);

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
      {/* <BabylonBg /> */}
      <div class="Content flex flex-col gap-4 p-3">
        <a href="/character/SYSTEM">默认机体</a>
      </div>
    </>
  );
}
