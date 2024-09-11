import { defaultSelectCharacter, SelectCharacter } from "~/schema/character";
import { createEffect, createSignal, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import Button from "~/components/ui/button";

export default function CharacterIndexPage() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  // 状态管理参数
  const characterList = store.characterPage.characterList;
  const setCharacterList = (value: SelectCharacter[]) => setStore("characterPage", "characterList", value);
  const character = store.character;
  const setCharacter = (value: SelectCharacter) => setStore("character", value);

  const [computeResult, setComputeResult] = createSignal<JSX.Element | null>(null);
  const [dialogMeberIndex, setDialogMeberIndex] = createSignal<number>(0);

  onMount(() => {
    console.log("--CharacterIndexPage Render");
    setCharacterList([defaultSelectCharacter, defaultSelectCharacter]);
    setCharacter(defaultSelectCharacter);

    return () => {
      console.log("--CharacterIndexPage Unmount");
    };
  });

  return (
    <>
      <div class="Title sticky left-0 mt-3 flex flex-col gap-9 py-5 p-3 lg:pt-12">
        <div class="Row flex flex-col items-center justify-between gap-10 lg:flex-row lg:justify-start lg:gap-4">
          <h1 class="Text text-left text-3xl lg:bg-transparent lg:text-4xl">{dictionary().ui.character.pageTitle}</h1>
          <div class="Control flex flex-1 gap-2">
            <input
              type="search"
              placeholder={dictionary().ui.searchPlaceholder}
              class="w-full flex-1 rounded-sm border-transition-color-20 bg-transition-color-8 px-3 py-2 backdrop-blur-xl placeholder:text-accent-color-50 hover:border-accent-color-70 hover:bg-transition-color-8 focus:border-accent-color-70 focus:outline-none lg:flex-1 lg:rounded-none lg:border-b-1.5 lg:bg-transparent lg:px-5 lg:font-normal"
            />
          </div>
        </div>
        <div class="Discription my-3 hidden rounded-sm bg-transition-color-8 p-3 lg:block">
          {dictionary().ui.character.description}
        </div>
        <div></div>
      </div>
      <div class="Content flex flex-col gap-4 p-3">
        <a href="/character/SYSTEM">默认机体</a>
      </div>
    </>
  );
}
