import { defaultCustomPet, CustomPet } from "~/repositories/customPet";
import { createEffect, createMemo, createSignal, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";

export default function CustomPetIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 状态管理参数
  const CustomPetList = store.wiki.petPage.petList;
  const setCustomPetList = (value: CustomPet[]) => setStore("wiki","petPage","petList", value);
  const CustomPet = defaultCustomPet;
  const setCustomPet = (value: CustomPet) => setStore("wiki","petPage", "petId", value.id);

  const [computeResult, setComputeResult] = createSignal<JSX.Element | null>(null);
  const [dialogMeberIndex, setDialogMeberIndex] = createSignal<number>(0);

  onMount(() => {
    console.log("--CustomPetIndexPage Render");
    setCustomPetList([defaultCustomPet, defaultCustomPet]);
    setCustomPet(defaultCustomPet);

    return () => {
      console.log("--CustomPetIndexPage Unmount");
    };
  });

  return (
    <>
      <div class="Content flex flex-col gap-4 p-3">
        <a href="/CustomPet/defaultCustomPetId">defaultCustomPetId</a>
      </div>
    </>
  );
}
